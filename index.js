const express = require('express');
const maxmind = require('maxmind');
const fs = require('fs');

const mmdbFile = require('path').join(__dirname, 'country_asn.mmdb');
const app = express();
app.set("json spaces", 2);
const port = 15787;

let reader;
(async () => {
  if (fs.existsSync(mmdbFile)) {
    reader = await maxmind.open(mmdbFile);
  } else {
    console.error(`Database file ${mmdbFile} tidak ditemukan!`);
    process.exit(1);
  }
})();

function isValidIP(ip) {
  const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^[0-9a-fA-F:]+$/;
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

function getFlagEmoji(countryCode) {
  return String.fromCodePoint(
    ...countryCode.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 'A'.charCodeAt(0))
  );
}

app.get('/:ip?', async (req, res) => {
  let ipAddress = req.params.ip;
  if (!ipAddress) {
    ipAddress = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim().replace(/::ffff:/g, '');
  }
  if (!isValidIP(ipAddress)) {
    return res.status(400).json({ error: 'Invalid IP address' });
  }

  try {
    if (!reader) {
      return res.status(500).json({ error: 'Database not loaded' });
    }
    const result = reader.get(ipAddress);
    const responseData = {
      ip: ipAddress,
      country: result?.country_name,
      countryCode: result?.country,
      countryFlags: result?.country ? getFlagEmoji(result.country) : undefined,
      continent: result?.continent,
      continentName: result?.continent_name,
      asn: result?.asn,
      isp: result?.as_name
    };
    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error' });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

module.exports = app;
