import React, { useState, useRef } from 'react';

export default function Contact() {
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    email: '',
    phone: '',
    subject: 'Demo Request',
    message: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  // Accordion state
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: 'How can my college use EcoVerse?',
      a: 'Your college can use EcoVerse to perform digital green audits, track campus carbon footprints, simulate ecological grid expansions (like rooftop solar and plantations), and receive AI-backed sustainability recommendations. Sign up for a demo to get started.'
    },
    {
      q: 'Can EcoVerse be customized?',
      a: 'Yes, EcoVerse can be fully customized to match your campus zone parameters, local energy tariffs, specific tree species guidelines, waste diversion policies, and institutional audit criteria.'
    },
    {
      q: 'Is training provided?',
      a: 'Absolutely. We provide full onboarding sessions for campus administrators, committee members, and student sustainability groups, along with comprehensive video documentation and user guides.'
    },
    {
      q: 'How can I request a demo?',
      a: 'Simply select "Demo Request" in the Contact Form above, fill in your details, and submit. You can also click the "Request a Demo" button at the bottom of this page to automatically jump to the form.'
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      organization: '',
      email: '',
      phone: '',
      subject: 'Demo Request',
      message: ''
    });
    setFormErrors({});
    setApiError('');
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required.';
    if (!formData.organization.trim()) errors.organization = 'Organization/College name is required.';
    
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email address.';
      }
    }

    if (!formData.message.trim()) {
      errors.message = 'Message is required.';
    } else if (formData.message.length > 1000) {
      errors.message = 'Message cannot exceed 1000 characters.';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed.');
      }
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      setApiError(err.message || 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDemoRequest = () => {
    setFormData(prev => ({ ...prev, subject: 'Demo Request' }));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Focus name field
    const nameInput = document.getElementById('contact-name');
    if (nameInput) nameInput.focus();
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-main text-body-main">
      {/* Ambient background decoration */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[-15%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="bg-surface border-b border-outline-variant py-16">
        <div className="max-w-[1280px] mx-auto px-6 md:px-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full mb-4">
            <span className="material-symbols-outlined text-sm active-icon">mail</span>
            <span className="text-xs font-bold uppercase tracking-wider">Get in touch</span>
          </div>
          <h1 className="text-hero-h1-mobile md:text-hero-h1 font-bold text-primary mb-4 leading-tight">
            Contact EcoVerse
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Interested in implementing EcoVerse at your institution? Get in touch with our team for a demo, partnership, or technical support.
          </p>
        </div>
      </section>

      {/* Contact Cards & Form Split View */}
      <section className="max-w-[1280px] mx-auto px-6 md:px-16 py-16 grid grid-cols-1 lg:grid-cols-12 gap-8" ref={formRef}>
        {/* Left Col: Info Cards */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-surface p-8 rounded-2xl border border-outline-variant/10 shadow-soft flex flex-col gap-8">
            <div>
              <h2 className="text-card-h3 font-card-h3 font-bold text-primary mb-2">Contact Us</h2>
              <p className="text-on-surface-variant text-sm">We are here to support your green transition. Contact us directly or use the contact form.</p>
            </div>

            {/* Info details */}
            <div className="flex flex-col gap-6">
              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined active-icon">call</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Call Us</p>
                  <p className="text-sm font-semibold text-on-surface mt-0.5">+91-9876543210</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Toll-free demo hotline</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary flex-shrink-0">
                  <span className="material-symbols-outlined active-icon">mail</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Email Us</p>
                  <a href="mailto:yashgarg2810@gmail.com" className="text-sm font-semibold text-on-surface hover:text-primary transition mt-0.5 block">
                    yashgarg2810@gmail.com
                  </a>
                  <p className="text-xs text-on-surface-variant mt-0.5">Response within 24 hours</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined active-icon">location_on</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Address</p>
                  <p className="text-sm font-semibold text-on-surface mt-0.5">Roorkee, Uttarakhand, India</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Pin Code: 247667</p>
                </div>
              </div>

              {/* Working Hours */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary flex-shrink-0">
                  <span className="material-symbols-outlined active-icon">schedule</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Working Hours</p>
                  <p className="text-sm font-semibold text-on-surface mt-0.5">Monday – Friday</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">9:00 AM – 6:00 PM IST</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Form Card */}
        <div className="lg:col-span-7">
          <div className="bg-surface p-8 rounded-2xl border border-outline-variant/10 shadow-soft min-h-[500px]">
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center text-center p-8 h-full fade-in-up">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
                  <span className="material-symbols-outlined text-4xl active-icon">check_circle</span>
                </div>
                <h3 className="text-section-h2 font-section-h2 text-primary font-bold mb-2">Thank you!</h3>
                <p className="text-on-surface font-semibold text-base mb-4">
                  Your message has been sent successfully.
                </p>
                <p className="text-on-surface-variant text-sm max-w-sm mb-8 leading-relaxed">
                  Thank you for contacting EcoVerse! Our team will reach out to you within 24–48 hours.
                </p>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs cursor-pointer hover:-translate-y-[1px] transition duration-200"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <h2 className="text-card-h3 font-card-h3 font-bold text-on-surface mb-1">Inquiry Form</h2>
                  <p className="text-on-surface-variant text-xs">Fill in your details below and we will contact you shortly.</p>
                </div>

                {apiError && (
                  <div className="flex items-center gap-2 p-3.5 bg-error-container text-on-error-container rounded-xl text-xs font-semibold">
                    <span className="material-symbols-outlined text-base">error</span>
                    {apiError}
                  </div>
                )}

                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-name" className="text-[11px] font-bold text-outline uppercase tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      id="contact-name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your Full Name"
                      className={`w-full bg-surface-container-low border rounded-xl px-4 py-3 text-on-surface text-sm focus:outline-none transition ${formErrors.name ? 'border-error' : 'border-outline-variant/60 focus:border-primary'}`}
                    />
                    {formErrors.name && <p className="text-xs text-error font-semibold mt-0.5">{formErrors.name}</p>}
                  </div>

                  {/* College/Organization */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-org" className="text-[11px] font-bold text-outline uppercase tracking-wider">College / Organization *</label>
                    <input
                      type="text"
                      id="contact-org"
                      name="organization"
                      value={formData.organization}
                      onChange={handleInputChange}
                      placeholder="e.g. Haridwar University"
                      className={`w-full bg-surface-container-low border rounded-xl px-4 py-3 text-on-surface text-sm focus:outline-none transition ${formErrors.organization ? 'border-error' : 'border-outline-variant/60 focus:border-primary'}`}
                    />
                    {formErrors.organization && <p className="text-xs text-error font-semibold mt-0.5">{formErrors.organization}</p>}
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-email" className="text-[11px] font-bold text-outline uppercase tracking-wider">Email Address *</label>
                    <input
                      type="email"
                      id="contact-email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@organization.edu"
                      className={`w-full bg-surface-container-low border rounded-xl px-4 py-3 text-on-surface text-sm focus:outline-none transition ${formErrors.email ? 'border-error' : 'border-outline-variant/60 focus:border-primary'}`}
                    />
                    {formErrors.email && <p className="text-xs text-error font-semibold mt-0.5">{formErrors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-phone" className="text-[11px] font-bold text-outline uppercase tracking-wider">Phone Number (Optional)</label>
                    <input
                      type="text"
                      id="contact-phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-primary transition"
                    />
                  </div>
                </div>

                {/* Subject Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-subject" className="text-[11px] font-bold text-outline uppercase tracking-wider">Subject *</label>
                  <select
                    id="contact-subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-primary transition font-semibold"
                  >
                    <option value="Demo Request">Demo Request</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Feedback">Feedback</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="contact-message" className="text-[11px] font-bold text-outline uppercase tracking-wider">Message *</label>
                    <span className="text-[10px] text-on-surface-variant font-semibold font-mono">
                      {formData.message.length}/1000 chars
                    </span>
                  </div>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows="5"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Enter your message details..."
                    className={`w-full bg-surface-container-low border rounded-xl px-4 py-3 text-on-surface text-sm focus:outline-none transition resize-none ${formErrors.message ? 'border-error' : 'border-outline-variant/60 focus:border-primary'}`}
                  />
                  {formErrors.message && <p className="text-xs text-error font-semibold mt-0.5">{formErrors.message}</p>}
                </div>

                {/* Form Buttons */}
                <div className="flex gap-4 mt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-primary text-on-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition hover:bg-primary/95 shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm font-bold">send</span>
                        Submit Message
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 bg-surface-container text-on-surface rounded-xl font-bold text-xs hover:bg-surface-container-high transition cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Google Map Section */}
      <section className="max-w-[1280px] mx-auto px-6 md:px-16 pb-16">
        <div className="bg-surface rounded-2xl border border-outline-variant/10 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-outline-variant/10">
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">map</span>
              Find Us On The Map
            </h3>
          </div>
          <div className="w-full h-[400px] bg-surface-container-low relative">
            <iframe
              title="EcoVerse Location Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d55239.123512282245!2d77.85408660309971!3d29.866014282869502!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390eb36e2f11885f%3A0x4a013a1ee9a59218!2sRoorkee%2C%20Uttarakhand!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-surface border-t border-b border-outline-variant py-16">
        <div className="max-w-[800px] mx-auto px-6">
          <h2 className="text-section-h2 font-section-h2 text-primary font-bold text-center mb-10">
            Frequently Asked Questions
          </h2>

          <div className="flex flex-col gap-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="bg-background rounded-2xl border border-outline-variant/20 overflow-hidden transition">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex justify-between items-center p-5 text-left font-bold text-on-surface hover:text-primary transition focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <span className="material-symbols-outlined text-primary font-bold transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                      keyboard_arrow_down
                    </span>
                  </button>
                  <div
                    className="transition-all duration-300 ease-in-out"
                    style={{ maxHeight: isOpen ? '200px' : '0', opacity: isOpen ? 1 : 0 }}
                  >
                    <p className="p-5 pt-0 text-sm text-on-surface-variant leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call To Action Footer */}
      <section className="py-20 text-center">
        <div className="max-w-[600px] mx-auto px-6">
          <h2 className="text-section-h2 font-section-h2 text-on-surface font-bold mb-4">
            Ready to make your campus more sustainable?
          </h2>
          <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
            Connect with our team today to request a custom digital-twin simulation and discover how your campus can reach net-zero offsets.
          </p>
          <button
            onClick={triggerDemoRequest}
            className="px-8 py-3.5 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-md pulse-hover transition cursor-pointer hover:bg-primary/95"
          >
            Request a Demo
          </button>
        </div>
      </section>
    </div>
  );
}
