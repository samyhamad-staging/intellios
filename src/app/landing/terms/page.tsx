/**
 * Terms of Service — Intellios
 * Server component. No client-side interactivity required.
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Intellios",
  description: "Terms of Service for Intellios AI agent platform",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Last updated: April 2026
          </p>
        </div>

        <div className="space-y-12">
          {/* Acceptance of Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Acceptance of Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a binding agreement between you (either an individual or organization) and Intellios (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) regarding your use of the Intellios platform and related services.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              By accessing or using Intellios, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you may not use the Services. We reserve the right to update these Terms at any time, and your continued use constitutes acceptance of modifications.
            </p>
          </section>

          {/* Description of Service */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Description of Service
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Intellios is an enterprise AI agent factory that enables organizations to:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400 mb-4">
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Design and configure AI agents under their own brand</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Apply governance policies and compliance controls</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Manage agent blueprints and versions</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Deploy agents while maintaining security and compliance posture</span>
              </li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              We provide the Services on an "as is" basis. We make no warranties about uninterrupted access, error-free operation, or specific results from using the Services.
            </p>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              User Accounts
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              To access Intellios, you may need to create an account. You are responsible for:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400 mb-4">
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Providing accurate, complete, and current information</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Maintaining the confidentiality of your account credentials</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Notifying us immediately of unauthorized access to your account</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>All activity conducted under your account</span>
              </li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity.
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Acceptable Use
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              You agree not to use Intellios to:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400 mb-4">
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Violate any applicable laws or regulations</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Infringe on intellectual property rights of others</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Transmit malware, viruses, or harmful code</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Attempt to gain unauthorized access to our systems</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Harass, threaten, or abuse other users</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Interfere with the normal operation of the Services</span>
              </li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Violation of acceptable use policies may result in account suspension or termination without refund.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Intellectual Property
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              The Intellios platform, including all code, design, features, and functionality, is owned by Intellios and protected by copyright and other intellectual property laws. You retain ownership of any content you create through the Services, including agent blueprints and configurations.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              You grant Intellios a limited license to use your content solely to provide the Services and improve our platform. You are responsible for ensuring that your use of content created through Intellios does not violate any third-party intellectual property rights.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Limitation of Liability
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400 mb-4">
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Intellios shall not be liable for any indirect, incidental, special, consequential, or punitive damages</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>Our total liability shall not exceed the amount paid by you in the past 12 months</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>We are not liable for any failure or delay due to circumstances beyond our reasonable control</span>
              </li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Some jurisdictions do not allow limitations of liability, so this limitation may not apply to you.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Governing Law and Jurisdiction
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              These Terms are governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of laws principles. You agree to submit to the exclusive jurisdiction of the state and federal courts located in Delaware for resolution of any disputes arising from these Terms or your use of Intellios.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              If you are located in the European Union or another jurisdiction with mandatory consumer protection laws, those laws will apply to the extent they are more protective than these Terms.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Contact Us
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-6 space-y-3">
              <p className="text-gray-900 dark:text-white font-medium">
                Intellios Legal Team
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Email:{" "}
                <a
                  href="mailto:legal@intellios.io"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium"
                >
                  legal@intellios.io
                </a>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                We will respond to all inquiries within 10 business days.
              </p>
            </div>
          </section>
        </div>
    </div>
  );
}
