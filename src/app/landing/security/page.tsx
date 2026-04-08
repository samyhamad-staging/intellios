/**
 * Security & Compliance — Intellios
 * Server component. Enterprise-focused security documentation.
 */

import { Metadata } from "next";
import { ShieldCheck, Lock, Eye, Server, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Security & Compliance — Intellios",
  description: "Intellios security, compliance, and data protection standards",
};

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
            Security & Compliance
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Enterprise-grade security, compliance controls, and data protection standards built into Intellios.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
            Last updated: April 2026
          </p>
        </div>

        <div className="space-y-12">
          {/* Security Overview */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <ShieldCheck size={28} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Security Overview
                </h2>
              </div>
            </div>
            <div className="space-y-4 ml-8">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Intellios implements defense-in-depth security architecture with multiple layers of protection:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Encryption at Rest
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    All data stored in Intellios is encrypted using AES-256 encryption. Database encryption is managed at the infrastructure level with regular key rotation.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Encryption in Transit
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    All data transmitted to and from Intellios is encrypted using TLS 1.3. Certificate pinning prevents man-in-the-middle attacks.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    SOC 2 Type II — Planned
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    SOC 2 Type II certification is on our compliance roadmap. Our security architecture is designed to meet SOC 2 trust service criteria for security, availability, and confidentiality. We will pursue formal audit engagement as part of our design partner onboarding phase.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Access Controls */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Lock size={28} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Access Controls
                </h2>
              </div>
            </div>
            <div className="space-y-4 ml-8">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Role-based access control (RBAC) ensures users have only the minimum permissions needed:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Role-Based Access Control
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Configurable roles (Admin, Editor, Reviewer, Viewer) with granular permission controls per resource. Principle of least privilege enforced across all operations.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Single Sign-On (SSO)
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Support for SAML 2.0 and OpenID Connect (OIDC) for enterprise identity integration. Seamless integration with Okta, Azure AD, Google Workspace, and other providers.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Multi-Factor Authentication (MFA)
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Mandatory MFA support for all users. TOTP, WebAuthn, and hardware security keys supported. MFA enforcement policies configurable per organization.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Session Management
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Configurable session timeouts, concurrent session limits, and automatic logout. Session activity tracking for security audits.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Data Protection */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Eye size={28} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Data Protection
                </h2>
              </div>
            </div>
            <div className="space-y-4 ml-8">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Industry-leading data protection practices protect your sensitive information:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Advanced Encryption Standard (AES-256)
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Military-grade encryption applied at multiple levels: field-level encryption for sensitive data, database-level encryption, and full-disk encryption for storage.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Multi-Tenant Isolation
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Complete logical and physical isolation between customer organizations. Data access strictly restricted to authenticated users within the owning organization.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Data Residency Options
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Data residency controls allow you to specify where your data is stored. Support for regional deployments to meet local data residency requirements.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Secure Data Deletion
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Data is cryptographically erased upon deletion. Backup copies are purged after retention period. Verification provided via audit logs.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Compliance Framework Alignment */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle size={28} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Compliance Framework Alignment
                </h2>
              </div>
            </div>
            <div className="space-y-3 ml-8">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Intellios is designed with compliance in mind, meeting requirements across major regulatory frameworks:
              </p>
              <div className="grid gap-3">
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    GDPR Compliance
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Data processing agreements, subject access request capabilities, right to erasure, data portability, and privacy by design.
                  </p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    HIPAA Compliance
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Business Associate Agreement (BAA) available. Encryption, access controls, audit logging, and breach notification procedures in place.
                  </p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    NIST AI Risk Management Framework
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Governance controls, transparency in AI agent design, monitoring and documentation of AI behavior throughout agent lifecycle.
                  </p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    EU AI Act Readiness
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    High-risk AI governance, risk assessment documentation, human oversight capabilities, and transparency mechanisms.
                  </p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    SEC Rule 10b5-1 Compliance
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Controls for insider trading, restricted access to material non-public information, and comprehensive trading activity logging.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Audit & Monitoring */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Server size={28} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Audit & Monitoring
                </h2>
              </div>
            </div>
            <div className="space-y-4 ml-8">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Comprehensive audit and monitoring capabilities provide visibility into all platform activity:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Comprehensive Audit Trails
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    All user actions logged with timestamps, IP addresses, and resource identifiers. Agent creation, modification, deployment, and deletion tracked. 365+ days of audit log retention.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Real-Time Monitoring & Alerting
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Real-time monitoring of system health, security events, and compliance violations. Configurable alerts for suspicious activity and security incidents.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Agent Behavior Monitoring
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Continuous monitoring of deployed agent behavior. Deviation from governance policies automatically detected and logged. Audit access to sensitive operations.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Incident Response */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Incident Response & Support
            </h2>
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  24-Hour Security Notification
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  In the event of a security incident affecting customer data, Intellios will notify affected organizations within 24 hours. Detailed incident report provided with analysis and remediation steps.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Dedicated Security Team
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Dedicated security team available for enterprise customers. Direct escalation path for security concerns. Regular security reviews and vulnerability assessments.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Vulnerability Disclosure Program
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Responsible disclosure policy for security researchers. Bug bounty program for external security testing. Rapid patching of discovered vulnerabilities.
                </p>
              </div>
            </div>
          </section>

          {/* Infrastructure */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Infrastructure & Reliability
            </h2>
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Hosting & Global Distribution
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Intellios is hosted on Vercel and AWS with multi-region deployment. 99.99% uptime SLA. DDoS protection, WAF rules, and rate limiting for all endpoints.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Automated Backups & Disaster Recovery
                  </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Automated daily backups with 30-day retention. Incremental backups throughout the day. Disaster recovery testing performed quarterly. RTO &lt; 1 hour, RPO &lt; 15 minutes.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Threat Detection & Prevention
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Advanced threat detection using behavioral analysis. Intrusion detection systems monitoring network traffic. Regular penetration testing and security audits.
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Security Inquiries
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              For security questions, compliance documentation, or to discuss specific security requirements, please contact our security team:
            </p>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-6 space-y-3">
              <p className="text-gray-900 dark:text-white font-medium">
                Intellios Security Team
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Email:{" "}
                <a
                  href="mailto:security@intellios.io"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium"
                >
                  security@intellios.io
                </a>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                We respond to all security inquiries within 24 hours. Enterprise customers receive priority support.
              </p>
            </div>
          </section>
        </div>
    </div>
  );
}
