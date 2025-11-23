const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const config = require('./ConfigLoader');

class AccessManager {
  constructor() {
    this.pineScripts = null;
    this.loadPineScripts();
  }

  loadPineScripts() {
    try {
      const scriptsPath = path.join(__dirname, '../../config/pine_scripts.json');
      const fileContents = fs.readFileSync(scriptsPath, 'utf8');
      this.pineScripts = JSON.parse(fileContents);
      console.log('✅ Pine scripts loaded successfully');
    } catch (error) {
      console.error('❌ Error loading pine scripts:', error);
      this.pineScripts = {};
    }
  }

  getAvailableScripts() {
    return Object.keys(this.pineScripts);
  }

  getPineIds(scriptName) {
    return this.pineScripts[scriptName] || [];
  }

async grantAccess(scriptName, username) {
    const pineIds = this.getPineIds(scriptName);
    
    if (pineIds.length === 0) {
      return {
        success: false,
        message: 'Script not found'
      };
    }

    const apiUrl = this.getApiUrl();
    const payload = JSON.stringify({
      pine_ids: pineIds,
      duration: "1L"
    });

    try {
      const data = await this.makePostRequest(apiUrl, username, payload);
      return this.processResponse(data);
    } catch (error) {
      console.error('Error calling access API:', error);
      return {
        success: false,
        message: `Failed to connect to API: ${error.message}`
      };
    }
  }

  makePostRequest(baseUrl, username, payload) {
    return new Promise((resolve, reject) => {
      const url = new URL(`/access/${username}`, baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      console.log('🔍 Making POST request to:', `${url.hostname}${url.pathname}`);
      console.log('📦 Payload:', payload);

      const req = httpModule.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            console.log('✅ Response status:', res.statusCode);
            console.log('📥 Response data:', data);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } else {
              reject(new Error(`API Error: ${res.statusCode} ${res.statusMessage}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Request error:', error);
        reject(error);
      });

      // Write data to request body
      req.write(payload);
      req.end();
    });
  }

  processResponse(data) {
    // data is an array of access results
    if (!Array.isArray(data) || data.length === 0) {
      return {
        success: false,
        message: 'Invalid response from API'
      };
    }

    // Check statuses
    const statuses = data.map(item => item.status);
    const allSuccess = statuses.every(status => status === 'Success');
    const allNotApplied = statuses.every(status => status === 'Not Applied');
    const anyFailure = statuses.some(status => status === 'Failure');

    if (allSuccess) {
      return {
        success: true,
        message: '✅ Your access is granted',
        details: data
      };
    } else if (allNotApplied) {
      return {
        success: true,
        message: '✅ You already have access',
        details: data
      };
    } else if (anyFailure) {
      return {
        success: false,
        message: '❌ Your access is denied',
        details: data
      };
    } else {
      // Mixed results
      return {
        success: true,
        message: '⚠️ Mixed results - some access granted, some failed',
        details: data
      };
    }
  }

  getApiUrl() {
    const replAccount = config.getEnv('REPL_ACCOUNT');
    if (!replAccount) {
      throw new Error('REPL_ACCOUNT not set in environment variables');
    }
    // return `https://Tradingview-Access-Management.${replAccount}.repl.co`;
    return `http://localhost:5000/`;
  }
}

module.exports = new AccessManager();