# CyberSentinal - Advanced Scam Detection Extension

A powerful Chrome extension that detects and alerts users to potential scams, phishing attacks, and fraudulent websites in real-time.

## Features

### 🛡️ Real-time Scam Detection
- **AI-powered analysis** of URLs and web content
- **Instant threat detection** for phishing and scam patterns
- **Visual indicators** showing safety score (0-100%)
- **Detailed threat reports** with forensic analysis

### ⚠️ Multi-level Alert System
- **Safety Badge**: Quick safety overview in extension popup
- **Alert Cards**: Prominent warnings for potential threats
- **Warning Badges**: In-page notifications for dangerous content
- **Analysis Reports**: Comprehensive threat analysis with recommendations

### 🔍 Threat Detection Capabilities
Detects:
- **Phishing attempts** (credential harvesting)
- **Account lockdown scams** (fake security alerts)
- **Prize/lottery scams** (false claims of winnings)
- **Financial fraud** (banking credential theft)
- **Urgency tactics** (pressure to act immediately)
- **Malicious URLs** (shortened, obfuscated, or suspicious domains)
- **Typosquatting** (domains mimicking legitimate sites)

### ⚙️ Customizable Protection Settings
- Enable/disable real-time protection
- Toggle suspicious site warnings
- Control phishing site blocking
- Advanced behavioral analytics
- View scan history and reports

## Project Structure

```
cyber-sentinal/
├── manifest.json              # Extension configuration
├── background.js              # Service worker (threat detection engine)
├── content.js                 # Content script (page monitoring)
├── detector.js                # Scam detection logic
├── popup/
│   ├── popup.html             # Main extension UI
│   ├── popup.css              # Styling for popup
│   └── popup.js               # Popup functionality
├── styles/
│   └── content.css            # Content script styling
├── utils/
│   └── helpers.js             # Utility functions
└── README.md                  # Documentation
```

## Installation

1. Clone or download this repository
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode" (top-right corner)
4. Click "Load unpacked"
5. Select the `cyber-sentinal` directory
6. The extension is now installed and active!

## Usage

### Quick Analysis
- Click the CyberSentinal shield icon to see the current page's safety score
- Suspicious sites will trigger alerts with detailed threat information

### View Details
- Click "View Details" on alerts to see comprehensive forensic analysis
- Review detected patterns, confidence scores, and recommendations

### Manage Settings
- Click the settings icon (⚙️) in the popup
- Customize protection levels and enable/disable features
- Save settings to apply changes

### Report Threats
- Click "Report as Phishing" in analysis reports
- Help improve protection for all users

## Safety Indicators

### Safe Site 🟢
- Green badge with check mark
- 95-100% safety score
- No threats detected

### Warning ⚠️ 
- Yellow badge
- 50-94% safety score
- Potential threats detected

### Dangerous 🔴
- Red badge
- 0-49% safety score
- High-risk threats confirmed

## Detection Methods

1. **URL Analysis**
   - Protocol verification (HTTPS/HTTP)
   - Domain validation
   - Length analysis
   - Special character detection

2. **Content Analysis**
   - Keyword pattern matching
   - Urgency tactic detection
   - Deception pattern recognition
   - Form context evaluation

3. **Behavioral Analysis**
   - Script execution monitoring
   - Form submission tracking
   - Page reload detection
   - Dynamic content scanning

4. **Reputation Checks**
   - Website history analysis
   - Domain registration data
   - Report aggregation
   - Threat intelligence

## Recommendations When Threat Found

- ✓ Avoid clicking suspicious links
- ✓ Don't download attachments from unknown sources
- ✓ Report to email/chat providers
- ✓ Enable two-factor authentication
- ✓ Verify URLs before sharing credentials
- ✓ Check official website directly

## Privacy & Security

- Extension operates locally in your browser
- No personal data collection
- No tracking of browsing history
- Encrypted communication with detection services
- Settings stored securely in Chrome's local storage

## Browser Compatibility

- ✓ Chrome 90+
- ✓ Edge 90+
- ✓ Brave
- ✓ Chromium-based browsers

## Troubleshooting

### Extension not detecting threats
1. Ensure real-time protection is enabled in settings
2. Check if advanced analytics is turned on
3. Refresh the page and try again
4. Restart Chrome if needed

### False positives
1. You can mark sites as safe to whitelist them
2. Report false positives to help improve detection

### Performance issues
1. Disable advanced analytics if experiencing slowdowns
2. Clear browser cache and extension storage
3. Restart Chrome

## Development

### Adding New Detection Patterns
Edit `detector.js` to add new scam patterns:
```javascript
deceptionPatterns: /new pattern here/i,
```

### Customizing UI
Modify `popup.css` for styling changes
Edit `popup.html` for structure modifications

### Testing
1. Load extension in developer mode
2. Open test pages in new tabs
3. Check console for debug messages
4. Review local storage in DevTools

## Support & Feedback

For issues, suggestions, or to report bugs:
- Check the detection history
- Review forensic data in detailed reports
- Contact support through the extension settings

## License

MIT License - See LICENSE file for details

## Disclaimer

This extension provides additional security features but is not a substitute for:
- Official antivirus software
- Browser security features
- System-level protection
- User vigilance and best practices

Always verify sensitive information through official channels.

---

**Stay Safe Online with CyberSentinal** 🛡️