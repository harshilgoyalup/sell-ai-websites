// Simple HTML escaping to sanitize output/inputs
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function validateInquiry(data) {
  const errors = [];
  const validProjectTypes = [
    'Business Website',
    'Landing Page',
    'E-commerce',
    'Web Application',
    'AI-Powered Website',
    'Website Redesign',
    'Other'
  ];

  const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const whatsapp = typeof data.whatsapp === 'string' ? data.whatsapp.trim() : '';
  const projectType = typeof data.projectType === 'string' ? data.projectType.trim() : '';
  const budget = typeof data.budget === 'string' ? data.budget.trim() : '';
  const timeline = typeof data.timeline === 'string' ? data.timeline.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';

  if (!fullName) {
    errors.push('Full Name is required.');
  }

  // Simple email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    errors.push('Email is required.');
  } else if (!emailRegex.test(email)) {
    errors.push('Please enter a valid email address.');
  }

  if (!whatsapp) {
    errors.push('WhatsApp number is required.');
  }

  if (!projectType) {
    errors.push('Project type is required.');
  } else if (!validProjectTypes.includes(projectType)) {
    errors.push('Invalid project type selected.');
  }

  if (!budget) {
    errors.push('Budget selection is required.');
  }

  if (!timeline) {
    errors.push('Timeline selection is required.');
  }

  if (!description) {
    errors.push('Project description is required.');
  } else if (description.length < 20) {
    errors.push('Please provide a more detailed project description (minimum 20 characters).');
  }

  // Optional website validation
  let website = typeof data.website === 'string' ? data.website.trim() : '';
  if (website) {
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      website = 'https://' + website;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      fullName: sanitizeString(fullName),
      email: sanitizeString(email),
      whatsapp: sanitizeString(whatsapp),
      company: sanitizeString(data.company || ''),
      projectType: sanitizeString(projectType),
      website: sanitizeString(website),
      budget: sanitizeString(budget),
      timeline: sanitizeString(timeline),
      description: sanitizeString(description)
    }
  };
}

module.exports = {
  validateInquiry,
  sanitizeString
};
