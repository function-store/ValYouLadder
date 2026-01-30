import Layout from "@/components/layout/Layout";
import { Shield, Mail } from "lucide-react";

const Privacy = () => {
  const lastUpdated = "January 30, 2026";
  const contactEmail = "privacy@example.com"; // Update with your email

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none space-y-8">
            <section className="node-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground">
                We are committed to protecting your privacy and ensuring compliance with the 
                General Data Protection Regulation (GDPR). This Privacy Policy explains how we 
                collect, use, and protect your personal data when you use our rate estimation 
                and project database platform.
              </p>
            </section>

            <section className="node-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">2. Data We Collect</h2>
              <div className="text-muted-foreground space-y-4">
                <p>We collect and process the following types of data:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong className="text-foreground">Project Submissions:</strong> Project type, 
                    client type, budget information, skills, expertise level, and location data. 
                    We do not collect personally identifiable information in submissions.
                  </li>
                  <li>
                    <strong className="text-foreground">Estimate Requests:</strong> Project parameters 
                    you enter when requesting rate estimates, along with the generated results.
                  </li>
                  <li>
                    <strong className="text-foreground">Account Information:</strong> If you create an 
                    admin account, we store your email address and encrypted password.
                  </li>
                  <li>
                    <strong className="text-foreground">Technical Data:</strong> Browser type, device 
                    information, and anonymized usage analytics for improving our service.
                  </li>
                </ul>
              </div>
            </section>

            <section className="node-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Data</h2>
              <div className="text-muted-foreground space-y-4">
                <p>Your data is used for the following purposes:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Providing accurate rate estimates based on aggregated market data</li>
                  <li>Building and maintaining an anonymous project rate database</li>
                  <li>Improving our estimation algorithms and user experience</li>
                  <li>Authenticating admin users for platform management</li>
                </ul>
              </div>
            </section>

            <section className="node-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">4. Legal Basis for Processing</h2>
              <div className="text-muted-foreground space-y-4">
                <p>We process your data based on:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong className="text-foreground">Consent:</strong> You explicitly consent to 
                    data collection when submitting projects or requesting estimates.
                  </li>
                  <li>
                    <strong className="text-foreground">Legitimate Interest:</strong> We analyze 
                    anonymized data to improve our services and provide market insights.
                  </li>
                  <li>
                    <strong className="text-foreground">Contract:</strong> Processing is necessary 
                    for providing the services you request.
                  </li>
                </ul>
              </div>
            </section>

            <section className="node-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">5. Data Retention</h2>
              <p className="text-muted-foreground">
                Project submissions and estimate data are retained indefinitely as part of our 
                anonymous market database. Admin account data is retained until you request 
                deletion. Technical logs are automatically deleted after 90 days.
              </p>
            </section>

            <section className="node-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">6. Your Rights Under GDPR</h2>
              <div className="text-muted-foreground space-y-4">
                <p>You have the following rights regarding your personal data:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong className="text-foreground">Right to Access:</strong> Request a copy 
                    of the personal data we hold about you.
                  </li>
                  <li>
                    <strong className="text-foreground">Right to Rectification:</strong> Request 
                    correction of inaccurate personal data.
                  </li>
                  <li>
                    <strong className="text-foreground">Right to Erasure:</strong> Request deletion 
                    of your personal data (note: anonymous submissions cannot be traced to 
                    individuals).
                  </li>
                  <li>
                    <strong className="text-foreground">Right to Object:</strong> Object to 
                    processing of your personal data.
                  </li>
                  <li>
                    <strong className="text-foreground">Right to Data Portability:</strong> Request 
                    your data in a portable format.
                  </li>
                </ul>
              </div>
            </section>

            <section className="node-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">7. Cookies</h2>
              <div className="text-muted-foreground space-y-4">
                <p>We use the following types of cookies:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong className="text-foreground">Essential Cookies:</strong> Required for 
                    basic site functionality (e.g., sidebar state, session management).
                  </li>
                  <li>
                    <strong className="text-foreground">Analytics Cookies:</strong> Help us 
                    understand how visitors use our site (only with your consent).
                  </li>
                </ul>
                <p>
                  You can manage your cookie preferences through our cookie consent banner or 
                  your browser settings.
                </p>
              </div>
            </section>

            <section className="node-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">8. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your 
                data, including encryption in transit and at rest, secure authentication, and 
                regular security audits. Access to personal data is restricted to authorized 
                personnel only.
              </p>
            </section>

            <section className="node-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">9. Third-Party Services</h2>
              <p className="text-muted-foreground">
                We use trusted third-party services for hosting and infrastructure. These 
                providers are GDPR-compliant and process data according to our data 
                processing agreements.
              </p>
            </section>

            <section className="node-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">10. Contact Us</h2>
              <div className="text-muted-foreground">
                <p className="mb-4">
                  For any privacy-related questions or to exercise your rights, please contact us:
                </p>
                <a 
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {contactEmail}
                </a>
              </div>
            </section>

            <section className="node-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">11. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any 
                significant changes by posting a notice on our website. Continued use of our 
                services after changes constitutes acceptance of the updated policy.
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Privacy;
