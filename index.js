const express = require('express');
const maxmind = require('maxmind');
const fs = require('fs');
const path = require('path');

const mmdbFile = path.join(__dirname, 'country_asn.mmdb');
const locationFile = path.join(__dirname, 'locations.json');
const app = express();
app.set("json spaces", 2);
const port = 15787;

const getLocationData = () => {
  if (!fs.existsSync(locationFile)) {
    throw new Error(`File ${locationFile} tidak ditemukan!`);
  }
  const data = fs.readFileSync(locationFile, 'utf8');
  return JSON.parse(data);
};

const getLocationByCountryCode = (countryCode, locations) => {
  return locations.find(location => location.cca2 === countryCode);
};

const lookup = async (ip) => {
  if (!fs.existsSync(mmdbFile)) {
    throw new Error(`Database file ${mmdbFile} tidak ditemukan!`);
  }
  const reader = await maxmind.open(mmdbFile);
  const response = reader.get(ip);
  return response;
};

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
    const locations = getLocationData();
    const result = await lookup(ipAddress);
    const countryCode = result?.country;
    const locationData = countryCode ? getLocationByCountryCode(countryCode, locations) : null;
    const responseData = {
      ip: ipAddress,
      country: result?.country_name,
      countryCode: result?.country,
      countryFlags: result?.country ? getFlagEmoji(result.country) : undefined,
      continent: result?.continent,
      continentName: result?.continent_name,
      asn: result?.asn,
      isp: result?.as_name,
      colo: locationData?.iata,
      latitude: locationData?.lat,
      longtidute: locationData?.lon,
      region: locationData?.region,
      city: locationData?.city
    };
    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

module.exports = app;
