---
id: "04-013"
title: "Deploy Intellios to Production"
slug: "deployment-guide"
type: "task"
audiences:
  - "engineering"
status: "draft"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios Platform Engineering"
reviewers: []
tags:
  - "deployment"
  - "production"
  - "aws"
  - "docker"
  - "ecs-fargate"
  - "devops"
prerequisites:
  - "02-004"
  - "04-004"
related:
  - "04-004"
  - "04-003"
  - "07-003"
  - "08-005"
next_steps:
  - "07-003"
  - "08-005"
feedback_url: "[PLACEHOLDER]"
tldr: >
  Complete walkthrough for deploying Intellios to a production AWS environment. Covers infrastructure setup (ECS Fargate, ALB, RDS, S3), application build and containerization, database migration, DNS and SSL configuration, deployment validation, and post-deployment monitoring. Expected time: 2–4 hours (depending on AWS account setup).
---

# Deploy Intellios to Production

> **TL;DR:** Deploy Intellios to production in 10 steps: set up AWS infrastructure (ECS cluster, ALB, RDS PostgreSQL, S3), build the Next.js application, configure environment variables, create a Docker image, deploy to ECS Fargate, run database migrations, configure DNS and SSL, verify the deployment with health checks and smoke tests, and set up monitoring and scaling policies.

## Goal

By the end of this guide, you will have a fully functional Intellios instance running on AWS Fargate in a production-grade configuration with observability, autoscaling, and high availability enabled.

## Prerequisites

Before starting, ensure you have:

- [ ] An AWS account with `AdministratorAccess` or equivalent permissions to create ECS, RDS, ALB, and networking resources
- [ ] A domain name registered (e.g., `intellios.example.com`) with DNS provider access
- [ ] An SSL certificate from AWS Certificate Manager (ACM) for your domain, or the ability to request one
- [ ] AWS CLI v2 installed and configured locally (`aws --version`)
- [ ] Docker installed locally (`docker --version`) for building and testing images
- [ ] Node.js 18+ and npm/yarn installed (`node --version`, `npm --version`)
- [ ] The Intellios source code checked out locally or access to your Git repository
- [ ] Environment variable values ready (Claude API key or Bedrock configuration, database credentials, runtime adapter settings)
- [ ] Familiarity with AWS services: ECS Fargate, RDS, Application Load Balancer (ALB), Route 53, ACM

---

## Steps

### Step 1: Plan and Validate Your Infrastructure

Before provisioning resources, plan the infrastructure topology and validate AWS service availability.

#### 1a. Infrastructure Topology

Intellios production deployment requires:

- **Compute:** ECS Fargate cluster (2+ tasks, autoscaling 2–10 tasks based on CPU/memory)
- **Database:** Amazon RDS PostgreSQL (14 or 15, db.t3.medium or larger, Multi-AZ for high availability)
- **Load Balancing:** Application Load Balancer (ALB) with health checks and HTTPS listener
- **Networking:** VPC with public subnets (ALB), private subnets (Fargate tasks, RDS)
- **DNS:** Route 53 or external DNS provider pointing to ALB
- **Storage:** S3 bucket for Intellios artifacts, blueprints, and audit logs
- **Secrets:** AWS Secrets Manager or Parameter Store for sensitive configuration (API keys, database passwords)

#### 1b. Validate Service Availability

```bash
# Check ECS Fargate is available in your region
aws ecs describe-clusters --region us-east-1 --query 'clusters[0]' 2>/dev/null || echo "ECS is available"

# Check RDS PostgreSQL versions available
aws rds describe-db-engine-versions \
  --engine postgres \
  --region us-east-1 \
  --query 'DBEngineVersions[?Engine==`postgres`] | [0]'

# Check ACM certificates
aws acm list-certificates --region us-east-1
```

**Expected result:**
- ECS is available (no errors).
- PostgreSQL 14 or 15 is available in your region.
- At least one ACM certificate exists or can be created.

### Step 2: Set Up the VPC and Networking

Create a VPC with public and private subnets for your Intellios deployment.

> **Tip:** Use the AWS VPC wizard for a quick setup, or use Terraform/CloudFormation for production reproducibility. This guide assumes manual setup.

#### 2a. Create a VPC

```bash
# Create a VPC (CIDR block: 10.0.0.0/16)
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --region us-east-1 \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC created: $VPC_ID"

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames \
  --region us-east-1
```

#### 2b. Create Subnets

```bash
# Public Subnet 1 (for ALB, AZ: us-east-1a)
PUBLIC_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --region us-east-1 \
  --query 'Subnet.SubnetId' \
  --output text)

# Public Subnet 2 (for ALB, AZ: us-east-1b)
PUBLIC_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --region us-east-1 \
  --query 'Subnet.SubnetId' \
  --output text)

# Private Subnet 1 (for Fargate tasks and RDS, AZ: us-east-1a)
PRIVATE_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.10.0/24 \
  --availability-zone us-east-1a \
  --region us-east-1 \
  --query 'Subnet.SubnetId' \
  --output text)

# Private Subnet 2 (for RDS failover, AZ: us-east-1b)
PRIVATE_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1b \
  --region us-east-1 \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Public Subnets: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
echo "Private Subnets: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"
```

#### 2c. Create Internet Gateway and Route Tables

```bash
# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --region us-east-1 \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

# Attach IGW to VPC
aws ec2 attach-internet-gateway \
  --internet-gateway-id $IGW_ID \
  --vpc-id $VPC_ID \
  --region us-east-1

# Create and configure public route table
PUBLIC_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --region us-east-1 \
  --query 'RouteTable.RouteTableId' \
  --output text)

# Add default route to IGW
aws ec2 create-route \
  --route-table-id $PUBLIC_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region us-east-1

# Associate public subnets with public route table
aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_1 \
  --route-table-id $PUBLIC_RT \
  --region us-east-1

aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_2 \
  --route-table-id $PUBLIC_RT \
  --region us-east-1

echo "VPC and subnets configured. VPC_ID=$VPC_ID, IGW_ID=$IGW_ID"
```

**Expected result:** VPC with 2 public subnets and 2 private subnets, configured for high availability across availability zones.

### Step 3: Create the RDS PostgreSQL Database

Provision a managed PostgreSQL database for Intellios.

```bash
# Create a DB subnet group (required for RDS in a VPC)
aws rds create-db-subnet-group \
  --db-subnet-group-name intellios-db-subnet-group \
  --db-subnet-group-description "Subnet group for Intellios RDS" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
  --region us-east-1

# Create a security group for RDS
SECURITY_GROUP_ID=$(aws ec2 create-security-group \
  --group-name intellios-rds-sg \
  --description "Security group for Intellios RDS instance" \
  --vpc-id $VPC_ID \
  --region us-east-1 \
  --query 'GroupId' \
  --output text)

# Allow PostgreSQL traffic from private subnets (port 5432)
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 5432 \
  --cidr 10.0.10.0/24 \
  --region us-east-1

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 5432 \
  --cidr 10.0.11.0/24 \
  --region us-east-1

# Create the RDS instance
# Note: This will take 10–15 minutes. Adjust db-instance-class and storage as needed.
aws rds create-db-instance \
  --db-instance-identifier intellios-prod-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username intellios_admin \
  --master-user-password "[PLACEHOLDER: Strong random password, 16+ chars]" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --db-subnet-group-name intellios-db-subnet-group \
  --vpc-security-group-ids $SECURITY_GROUP_ID \
  --no-publicly-accessible \
  --multi-az \
  --storage-encrypted \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --region us-east-1 \
  --tags Key=Environment,Value=production Key=Application,Value=intellios

# Wait for DB creation (takes 10–15 minutes)
echo "Waiting for RDS instance to be available..."
aws rds wait db-instance-available \
  --db-instance-identifier intellios-prod-db \
  --region us-east-1

# Get the RDS endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier intellios-prod-db \
  --region us-east-1 \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "RDS instance is ready. Endpoint: $DB_ENDPOINT"
```

**Expected result:** RDS PostgreSQL instance is running and accessible from private subnets. Save the endpoint and credentials for Step 5.

### Step 4: Build the Intellios Docker Image

Build a production-ready Docker image for the Next.js application.

#### 4a. Create a Multi-Stage Dockerfile

In the root of the Intellios repository, create or update `Dockerfile`:

```dockerfile
# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Stage 2: Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/lib ./src/lib

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Run application
CMD ["npm", "run", "start"]
```

#### 4b. Build the Image Locally

```bash
# Navigate to the Intellios repository root
cd /path/to/intellios

# Build the Docker image
docker build \
  --tag intellios:latest \
  --tag intellios:1.2.0 \
  .

# Test the image locally (optional)
docker run --rm \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_API_URL=http://localhost:3000 \
  intellios:latest

# Check that the application is healthy
curl http://localhost:3000/health
```

**Expected result:** Docker image builds successfully without errors. Local test shows the application is responsive on port 3000.

#### 4c. Push Image to ECR

Create an AWS ECR repository and push the image.

```bash
# Create an ECR repository
aws ecr create-repository \
  --repository-name intellios \
  --region us-east-1 \
  --image-tag-mutability MUTABLE \
  --image-scanning-configuration scanOnPush=true

# Get the ECR repository URI
ECR_REPO=$(aws ecr describe-repositories \
  --repository-names intellios \
  --region us-east-1 \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "ECR Repository: $ECR_REPO"

# Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REPO

# Tag and push the image
docker tag intellios:latest $ECR_REPO:latest
docker tag intellios:1.2.0 $ECR_REPO:1.2.0

docker push $ECR_REPO:latest
docker push $ECR_REPO:1.2.0
```

**Expected result:** Docker image is pushed to ECR and accessible for ECS deployment.

### Step 5: Configure Environment Variables and Secrets

Prepare environment variables for your Intellios instance. Store sensitive values in AWS Secrets Manager.

#### 5a. Create Secrets in Secrets Manager

```bash
# Database connection secret
aws secretsmanager create-secret \
  --name intellios/db/password \
  --description "Intellios RDS database password" \
  --secret-string "[PLACEHOLDER: Use the password from Step 3]" \
  --region us-east-1

# Claude API key (if using Anthropic Claude instead of Bedrock)
aws secretsmanager create-secret \
  --name intellios/claude/api-key \
  --description "Anthropic Claude API key" \
  --secret-string "[PLACEHOLDER: Your Claude API key]" \
  --region us-east-1

# Webhook secret (for signed callbacks)
aws secretsmanager create-secret \
  --name intellios/webhooks/secret \
  --description "Webhook signing secret" \
  --secret-string "$(openssl rand -hex 32)" \
  --region us-east-1
```

#### 5b. Environment Variable Reference Table

| Variable | Value | Sensitivity | Source |
|---|---|---|---|
| `NODE_ENV` | `production` | Public | Set directly |
| `NEXT_PUBLIC_API_URL` | `https://intellios.example.com` | Public | Set directly |
| `DATABASE_URL` | `postgresql://intellios_admin:[PASSWORD]@[DB_ENDPOINT]:5432/intellios` | Secret | Secrets Manager |
| `CLAUDE_API_KEY` | Your Anthropic Claude key | Secret | Secrets Manager |
| `AWS_REGION` | `us-east-1` | Public | Set directly |
| `AWS_ACCESS_KEY_ID` | [PLACEHOLDER] | Secret | IAM role (preferred) or Secrets Manager |
| `AWS_SECRET_ACCESS_KEY` | [PLACEHOLDER] | Secret | IAM role (preferred) or Secrets Manager |
| `BEDROCK_AGENT_RESOURCE_ROLE_ARN` | `arn:aws:iam::123456789012:role/IntelliosBedrocAgent` | Public | Set directly |
| `INTELLIOS_WEBHOOK_SECRET` | From Secrets Manager | Secret | Secrets Manager |

### Step 6: Create ECS Cluster and Task Definition

Set up an ECS Fargate cluster and define the Intellios task.

#### 6a. Create ECS Cluster

```bash
# Create an ECS cluster
aws ecs create-cluster \
  --cluster-name intellios-prod \
  --region us-east-1 \
  --tags key=Environment,value=production key=Application,value=intellios

echo "ECS Cluster created: intellios-prod"
```

#### 6b. Create IAM Role for ECS Task

```bash
# Create trust policy for ECS tasks
cat > /tmp/ecs-task-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the task execution role
aws iam create-role \
  --role-name intellios-ecs-task-execution-role \
  --assume-role-policy-document file:///tmp/ecs-task-trust-policy.json \
  --region us-east-1

# Attach the ECS task execution policy
aws iam attach-role-policy \
  --role-name intellios-ecs-task-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
  --region us-east-1

# Attach Secrets Manager access policy
cat > /tmp/ecs-secrets-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:intellios/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:log-group:/ecs/intellios-prod"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name intellios-ecs-task-execution-role \
  --policy-name intellios-ecs-secrets-access \
  --policy-document file:///tmp/ecs-secrets-policy.json

# Create the task role (for Bedrock and AWS service access)
aws iam create-role \
  --role-name intellios-ecs-task-role \
  --assume-role-policy-document file:///tmp/ecs-task-trust-policy.json \
  --region us-east-1

# Attach Bedrock and other AWS service permissions
cat > /tmp/ecs-task-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:CreateAgent",
        "bedrock:PrepareAgent",
        "bedrock:UpdateAgent",
        "bedrock:GetAgent",
        "bedrock:ListAgents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::intellios-artifacts",
        "arn:aws:s3:::intellios-artifacts/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name intellios-ecs-task-role \
  --policy-name intellios-ecs-task-policy \
  --policy-document file:///tmp/ecs-task-policy.json

echo "IAM roles created for ECS task execution and application access"
```

#### 6c. Create ECS Task Definition

```bash
# Get the ECR image URI from Step 4
ECR_REPO="[PLACEHOLDER: From Step 4]"

# Get task execution role ARN
TASK_EXECUTION_ROLE_ARN=$(aws iam get-role \
  --role-name intellios-ecs-task-execution-role \
  --query 'Role.Arn' \
  --output text)

TASK_ROLE_ARN=$(aws iam get-role \
  --role-name intellios-ecs-task-role \
  --query 'Role.Arn' \
  --output text)

# Create task definition JSON
cat > /tmp/ecs-task-definition.json <<EOF
{
  "family": "intellios-prod",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "$TASK_EXECUTION_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "intellios",
      "image": "$ECR_REPO:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "NEXT_PUBLIC_API_URL",
          "value": "https://intellios.example.com"
        },
        {
          "name": "AWS_REGION",
          "value": "us-east-1"
        },
        {
          "name": "BEDROCK_AGENT_RESOURCE_ROLE_ARN",
          "value": "arn:aws:iam::123456789012:role/IntelliosBedrocAgent"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:intellios/db/password"
        },
        {
          "name": "CLAUDE_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:intellios/claude/api-key"
        },
        {
          "name": "INTELLIOS_WEBHOOK_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:intellios/webhooks/secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/intellios-prod",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register the task definition
aws ecs register-task-definition \
  --cli-input-json file:///tmp/ecs-task-definition.json \
  --region us-east-1

echo "ECS task definition registered: intellios-prod"
```

**Expected result:** ECS cluster is created and task definition is registered. ECS is ready to launch tasks.

### Step 7: Create Application Load Balancer

Set up an ALB to route traffic to Intellios tasks.

```bash
# Create security group for ALB
ALB_SG=$(aws ec2 create-security-group \
  --group-name intellios-alb-sg \
  --description "Security group for Intellios ALB" \
  --vpc-id $VPC_ID \
  --region us-east-1 \
  --query 'GroupId' \
  --output text)

# Allow HTTP and HTTPS traffic from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region us-east-1

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region us-east-1

# Create security group for ECS tasks
ECS_SG=$(aws ec2 create-security-group \
  --group-name intellios-ecs-sg \
  --description "Security group for Intellios ECS tasks" \
  --vpc-id $VPC_ID \
  --region us-east-1 \
  --query 'GroupId' \
  --output text)

# Allow traffic from ALB to ECS tasks (port 3000)
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp \
  --port 3000 \
  --source-security-group-id $ALB_SG \
  --region us-east-1

# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name intellios-alb \
  --subnets $PUBLIC_SUBNET_1 $PUBLIC_SUBNET_2 \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --region us-east-1 \
  --tags Key=Environment,Value=production Key=Application,Value=intellios \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region us-east-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB created. DNS: $ALB_DNS"

# Create target group
TG_ARN=$(aws elbv2 create-target-group \
  --name intellios-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Target group created: $TG_ARN"

# Create HTTP listener (redirect to HTTPS)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
  --region us-east-1

# Note: HTTPS listener will be created in Step 9 after SSL certificate setup

# Save variables for later steps
echo "export ALB_ARN=$ALB_ARN" >> /tmp/intellios-vars.sh
echo "export ALB_DNS=$ALB_DNS" >> /tmp/intellios-vars.sh
echo "export TG_ARN=$TG_ARN" >> /tmp/intellios-vars.sh
echo "export ECS_SG=$ECS_G" >> /tmp/intellios-vars.sh
```

**Expected result:** ALB is created with a target group and HTTP listener. ALB is ready to route traffic to ECS tasks.

### Step 8: Deploy Intellios to ECS and Run Database Migrations

Launch the Intellios application in ECS Fargate and initialize the database.

#### 8a. Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/intellios-prod \
  --region us-east-1

aws logs put-retention-policy \
  --log-group-name /ecs/intellios-prod \
  --retention-in-days 30 \
  --region us-east-1
```

#### 8b. Create ECS Service

```bash
# Load saved variables
source /tmp/intellios-vars.sh

# Create ECS service
aws ecs create-service \
  --cluster intellios-prod \
  --service-name intellios-service \
  --task-definition intellios-prod:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --load-balancers targetGroupArn=$TG_ARN,containerName=intellios,containerPort=3000 \
  --health-check-grace-period-seconds 60 \
  --region us-east-1 \
  --tags key=Environment,value=production key=Application,value=intellios

echo "ECS service created: intellios-service"
```

#### 8c. Wait for Tasks to Become Healthy

```bash
# Wait for service to reach a stable state (tasks healthy)
aws ecs wait services-stable \
  --cluster intellios-prod \
  --services intellios-service \
  --region us-east-1

echo "ECS service is stable. Tasks are healthy."

# List running tasks
aws ecs list-tasks \
  --cluster intellios-prod \
  --service-name intellios-service \
  --region us-east-1 \
  --query 'taskArns'
```

#### 8d. Run Database Migrations

Once tasks are running, run Drizzle migrations to initialize the database schema.

```bash
# Get one of the running task ARNs
TASK_ARN=$(aws ecs list-tasks \
  --cluster intellios-prod \
  --service-name intellios-service \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

# Run the migration command in the task (using ECS Exec)
aws ecs execute-command \
  --cluster intellios-prod \
  --task $TASK_ARN \
  --container intellios \
  --interactive \
  --command "npx drizzle-kit migrate" \
  --region us-east-1
```

**Expected result:** Database migrations complete successfully. Schema is initialized in RDS PostgreSQL.

### Step 9: Configure DNS and SSL

Set up Route 53 and SSL/TLS for your domain.

#### 9a. Verify ACM Certificate

If you don't already have an SSL certificate, request one:

```bash
# Request a new ACM certificate
aws acm request-certificate \
  --domain-name intellios.example.com \
  --domain-name "*.intellios.example.com" \
  --validation-method DNS \
  --region us-east-1

# Wait for certificate to be issued (usually takes a few minutes)
# You will need to validate domain ownership by adding DNS CNAME records to your DNS provider
```

Get your certificate ARN:

```bash
# List all certificates
aws acm list-certificates --region us-east-1

# Get the ARN of your certificate
CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/[certificate-id]"
echo "Certificate ARN: $CERT_ARN"
```

#### 9b. Create HTTPS Listener

```bash
# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region us-east-1
```

#### 9c. Add Route 53 Record

If using Route 53 for DNS:

```bash
# Get hosted zone ID for your domain
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name example.com \
  --query 'HostedZones[0].Id' \
  --output text | cut -d'/' -f3)

# Get ALB DNS name (if not saved)
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region us-east-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Create Route 53 alias record
cat > /tmp/route53-change.json <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "intellios.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file:///tmp/route53-change.json \
  --region us-east-1

echo "Route 53 record created: intellios.example.com -> $ALB_DNS"
```

**Expected result:** Your domain is configured to point to the ALB. HTTPS is enabled with a valid SSL certificate.

### Step 10: Verify Deployment and Configure Observability

Validate the deployment end-to-end and set up monitoring.

#### 10a. Health Check

```bash
# Test the health check endpoint
curl -v https://intellios.example.com/health

# Expected response: HTTP 200 with { "status": "ok" }
```

#### 10b. Smoke Test: Create an Agent

Test the full workflow by creating and deploying a test agent:

1. Sign in to Intellios at `https://intellios.example.com`.
2. Navigate to **Intake** and start a new agent design session.
3. Fill in the intake form (name, description, 1–2 tools).
4. Generate a blueprint.
5. Approve the blueprint.
6. Deploy to AWS AgentCore.
7. Verify deployment succeeds.

#### 10c. Configure CloudWatch Alarms

```bash
# Alarm: ECS tasks unhealthy
aws cloudwatch put-metric-alarm \
  --alarm-name intellios-unhealthy-tasks \
  --alarm-description "Alert when Intellios ECS tasks are unhealthy" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:intellios-alerts \
  --region us-east-1

# Alarm: ALB 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name intellios-alb-5xx-errors \
  --alarm-description "Alert on ALB 5xx errors" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:intellios-alerts \
  --region us-east-1
```

#### 10d. Configure ECS Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/intellios-prod/intellios-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10 \
  --region us-east-1

# Create scaling policy: scale up on high CPU
aws application-autoscaling put-scaling-policy \
  --policy-name intellios-scale-up \
  --service-namespace ecs \
  --resource-id service/intellios-prod/intellios-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{"TargetValue":70.0,"PredefinedMetricSpecification":{"PredefinedMetricType":"ECSServiceAverageCPUUtilization"},"ScaleOutCooldown":60,"ScaleInCooldown":300}' \
  --region us-east-1

echo "Auto scaling configured: 2–10 tasks based on CPU utilization (70%)"
```

**Expected result:** Deployment is live and serving traffic over HTTPS. Monitoring and auto scaling are configured.

---

## Verification

Confirm the entire production deployment is working correctly.

### 1. Health Check Endpoint

```bash
curl -H "Authorization: Bearer [API_TOKEN]" \
  https://intellios.example.com/health
```

**Success criteria:** HTTP 200 response with `{ "status": "ok", "database": "connected", "adapters": ["agentcore"] }`.

### 2. Create and Deploy a Test Agent

1. Sign in to Intellios.
2. Go to **Intake** and complete an agent design.
3. Generate a blueprint.
4. Approve the blueprint in the review queue.
5. Deploy to AWS AgentCore.

**Success criteria:**
- Deployment completes within 90 seconds.
- Agent is visible in the AWS Bedrock console.
- Deployment metadata is stored in Intellios.

### 3. Verify Database Connectivity

```bash
# From within an ECS task (using ECS Exec):
# psql $DATABASE_URL -c "SELECT version();"

# Or test from a bastion host or local machine (if accessible):
# psql postgresql://intellios_admin:[PASSWORD]@[DB_ENDPOINT]:5432/intellios -c "\dt"
```

**Success criteria:** Database is reachable and schema tables are initialized.

### 4. Monitor CloudWatch Logs

```bash
# Stream logs from all Intellios tasks
aws logs tail /ecs/intellios-prod --follow --region us-east-1
```

**Success criteria:** Logs show successful requests, no persistent errors, and database migrations completed.

### 5. Load Test (Optional)

```bash
# Simple load test using Apache Bench (ab)
ab -n 100 -c 10 https://intellios.example.com/health

# Or use siege for sustained load
siege -c 20 -r 5 -u https://intellios.example.com/health
```

**Success criteria:** All requests succeed (HTTP 200), response times are reasonable (<500ms), no timeouts or errors.

---

## Troubleshooting

If you encounter issues during deployment:

| Symptom | Likely Cause | Resolution |
|---|---|---|
| ECS tasks are stuck in `PENDING` state | IAM role permissions insufficient or task definition issue | Check ECS task logs in CloudWatch. Verify IAM role has Secrets Manager access. Re-register task definition. |
| Tasks transition to `STOPPED` with exit code 1 | Application error during startup | Check CloudWatch logs `/ecs/intellios-prod`. Common: invalid `DATABASE_URL` or missing environment variables. |
| ALB shows "Unhealthy" targets | Health check endpoint failing | Verify the `/health` endpoint is accessible. Check security group allows 3000 port from ALB to ECS. |
| "Certificate validation failed" during HTTPS listener creation | ACM certificate not validated or ARN is incorrect | Verify certificate status is "Issued" in AWS console. Validate domain ownership with DNS CNAME record if needed. |
| Database migration hangs or times out | Network or RDS connectivity issue | Verify RDS security group allows 5432 from private subnets. Check RDS is in healthy state. Test connectivity from bastion host. |
| Route 53 record points to ALB but DNS doesn't resolve | DNS propagation delay or hosted zone ID mismatch | Wait 5–10 minutes for DNS propagation. Verify hosted zone ID is correct (`aws route53 list-hosted-zones`). Test with `nslookup intellios.example.com`. |
| Application returns 502 Bad Gateway after deployment | ALB routing to unhealthy targets | Check target group health check configuration. Verify ECS tasks are in RUNNING state. Review task logs for application errors. |

For additional help, see [Integrating with AWS AgentCore](agentcore-integration.md) or [Observability and Monitoring](../07-administration-operations/observability-dashboards.md).

---

## Next Steps

Now that you have deployed Intellios to production:

- **Monitor health and performance:** Set up detailed observability dashboards and alerting. See [Observability and Monitoring](../07-administration-operations/observability-dashboards.md).
- **Configure backup and disaster recovery:** Enable RDS automated backups, set up cross-region failover. Document in [Disaster Recovery Plan](../07-administration-operations/backup-recovery.md).
- **Integrate with runtime adapters:** Deploy agents to AWS AgentCore. See [Integrate with AWS AgentCore](agentcore-integration.md).
- **Secure and harden:** Enable VPC Flow Logs, review IAM policies, configure WAF rules on ALB. See [Security and Trust](../08-security-trust/).
- **Document your infrastructure:** Record the deployment topology, environment configuration, and runbooks in your team's operational documentation.

---

*See also: [Integrate Intellios with AWS AgentCore](agentcore-integration.md) · [Runtime Adapter Configuration](runtime-adapter-pattern.md) · [Engineer Setup Guide](../02-getting-started/engineer-setup-guide.md) · [Observability and Monitoring](../07-administration-operations/observability-dashboards.md)*
