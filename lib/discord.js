const path = require('path');

async function sendDiscordNotification(inquiry) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    // Gracefully skip if webhook URL is not configured
    return false;
  }

  // Format the Discord Embed Message
  const embed = {
    title: "🆕 New Project Inquiry Received",
    description: `A new client has submitted a project request on your website.`,
    color: 0x000000, // Hex #000000 (Black) matching grayscale identity
    fields: [
      {
        name: "👤 Client Profile",
        value: `**Name:** ${inquiry.fullName}\n**Email:** ${inquiry.email}\n**WhatsApp:** ${inquiry.whatsapp}\n**Company:** ${inquiry.company || '—'}`,
        inline: false
      },
      {
        name: "💻 Project Scope",
        value: `**Type:** ${inquiry.projectType}\n**Budget:** ${inquiry.budget}\n**Timeline:** ${inquiry.timeline}\n**Current Site:** ${inquiry.website || '—'}`,
        inline: false
      },
      {
        name: "📝 Project Description",
        value: inquiry.description.length > 1000 
          ? `${inquiry.description.substring(0, 1000)}...` 
          : inquiry.description,
        inline: false
      }
    ],
    footer: {
      text: `Harshil Goyal Web Services | Lead ID: #${inquiry.id}`
    },
    timestamp: new Date().toISOString()
  };

  const payload = {
    embeds: [embed]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Discord webhook responded with error status: ${response.status}. Details: ${errorText}`);
      return false;
    }

    console.log(`Discord Webhook notification successfully sent for Lead #${inquiry.id}.`);
    return true;
  } catch (error) {
    console.error(`Failed to send Discord webhook notification for Lead #${inquiry.id}:`, error);
    return false;
  }
}

module.exports = {
  sendDiscordNotification
};
