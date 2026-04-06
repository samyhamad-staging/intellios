/**
 * Privacy Policy — Intellios
 * Server component. No client-side interactivity required.
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Intellios",
  description: "Privacy Policy for Intellios AI agent platform",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Last updated: April 2026
          </p>
        </div>

        <div className="space-y-12">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Introduction
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Intellios ("Company," "we," "us," or "our") operates the Intellios platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do not use our Services. By accessing and using Intellios, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Information You Provide
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We collect information you directly provide, including:
                </p>
                <ul className="mt-2 space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex gap-3">
                    <span className="text-indigo-600">•</span>
                    <span>Account registration information (name, email, company details)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-indigo-600">•</span>
                    <span>Communication preferences and support requests</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-indigo-600">•</span>
                    <span>Agent configuration data and governance policies you create</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-indigo-600">•</span>
                    <span>Billing and payment information</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Automatically Collected Information
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  When you access our Services, we automatically collect:
                </p>
                <ul className="mt-2 space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex gap-3">
                    <span className="text-indigo-600">•</span>
                    <span>Log data (IP address, browser type, pages visited, timestamps)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-indigo-600">•</span>
                    <span>Device information and operating system details</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-indigo-600">•</span>
                    <span>Usage analytics and feature interaction patterns</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-indigo-600">•</span>
                    <span>Cookies and similar tracking technologies</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              How We Use Information
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Providing and maintaining the Intellios platform</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Processing transactions and sending related information</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Improving and personalizing your user experience</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Sending technical notices, updates, and support messages</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Responding to your comments, questions, and requests</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Monitoring and analyzing trends, usage, and activities for security purposes</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Detecting, preventing, and addressing fraud and security incidents</span>
              </li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Data Retention
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              We retain your information for as long as your account is active or as needed to provide you with the Services. You have the right to request deletion of your personal data at any time. We will retain certain information for compliance with legal obligations and to resolve disputes.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Agent blueprints and governance policies are retained in accordance with your data retention settings and applicable legal requirements.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Your Rights
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Depending on your location, you may have the following rights regarding your personal information:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Right to access your personal data</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Right to correct inaccurate data</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Right to delete your data</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Right to restrict processing of your data</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Right to data portability</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600">•</span>
                <span>Right to opt-out of marketing communications</span>
              </li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mt-4">
              To exercise these rights, please contact us at{" "}
              <a
                href="mailto:privacy@intellios.io"
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                privacy@intellios.io
              </a>
              .
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Contact Us
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or our privacy practices, please contact us:
            </p>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-6 space-y-3">
              <p className="text-gray-900 dark:text-white font-medium">
                Intellios Privacy Team
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Email:{" "}
                <a
                  href="mailto:privacy@intellios.io"
                  className="text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  privacy@intellios.io
                </a>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                We will respond to all requests within 30 days or as required by applicable law.
              </p>
            </div>
          </section>
        </div>
    </div>
  );
}
