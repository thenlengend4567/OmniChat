/**
 * OmniChat Production-Grade Security Audit Scanner
 * 
 * This script recursively scans the codebase for security violations:
 * 1. SEC-001: Placeholder code, mockup data, and temporary bypasses in production code paths.
 * 2. SEC-002: Hardcoded credentials, exposed passwords, API keys, or private keys.
 * 3. SEC-003: Insecure cookie configurations (e.g. secure or httpOnly set to false).
 * 
 * Supports marking a line with '// security-ignore' to deliberately exclude false positives.
 */

const fs = require('fs');
const path = require('path');

// Root of the workspace to scan
const ROOT_DIR = path.join(__dirname, '..');

// Directories to ignore during scanning
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  'target',
  '.next',
  'out',
  'coverage',
  'scripts', // Exclude security script itself
  'artifacts'
];

const IGNORE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.zip', '.tar', '.gz', '.pdf', '.exe', '.msi'
];

const IGNORE_FILES = [
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'security-scan.js'
];

// Scanner Rules Definitions
const RULES = [
  {
    id: 'SEC-001',
    name: 'Placeholder Code & Temporary Bypasses',
    description: 'Ensure no active placeholders, mockup data, or temporary bypasses exist in production code paths.',
    severity: 'ERROR',
    match: (content, filePath) => {
      const findings = [];
      const lines = content.split('\n');
      
      const placeholderRules = [
        { regex: /TEMP_BYPASS/i, msg: 'Detected active TEMPORARY BYPASS flag/code' },
        { regex: /PLACEHOLDER/i, msg: 'Detected PLACEHOLDER code blocks' },
        { regex: /mockData|mockUsers|mockMessages/i, msg: 'Detected hardcoded mock/dummy data usage in critical code paths' },
        { regex: /dummy-data|dummyData/i, msg: 'Detected dummy-data structures' }
      ];

      lines.forEach((line, index) => {
        if (line.includes('security-ignore')) return;

        placeholderRules.forEach(rule => {
          if (rule.regex.test(line)) {
            // Refine matching for PLACEHOLDER rule to avoid HTML and Tailwind styling false positives
            if (rule.regex.source.includes('PLACEHOLDER')) {
              const cleanedLine = line
                .replace(/placeholder\s*=\s*(?:['"`][^'"`]*['"`]|\{[^}]*\})/g, '')
                .replace(/\bplaceholder-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|brand)(?:-\d+)?(?:\/\d+)?\b/g, '')
                .replace(/\bplaceholder:[\w-:/]+/g, '');
              
              if (!/placeholder/i.test(cleanedLine)) {
                return; // Ignore false positive
              }
            }

            findings.push({
              line: index + 1,
              content: line.trim(),
              message: rule.msg
            });
          }
        });
        
        // Match standard TODOs/FIXMEs as warnings
        const todoRegex = /\b(TODO|FIXME)\b/i;
        if (todoRegex.test(line)) {
          findings.push({
            line: index + 1,
            content: line.trim(),
            message: 'Detected active TODO or FIXME developer comment',
            severityOverride: 'WARNING'
          });
        }
      });
      return findings;
    }
  },
  {
    id: 'SEC-002',
    name: 'Exposed Credentials & Hardcoded Secrets',
    description: 'Scanning for hardcoded passwords, tokens, API keys, or private keys.',
    severity: 'ERROR',
    match: (content, filePath) => {
      const findings = [];
      const lines = content.split('\n');
      
      // Matches assignments like key = "value" or key: "value" for sensitive terms
      const secretRegex = /\b(password|passwd|client_secret|clientSecret|api_key|apiKey|secret_key|secretKey|private_key|privateKey)\s*[:=]\s*['"]([^'"]+)['"]/i;
      
      lines.forEach((line, index) => {
        if (line.includes('security-ignore')) return;

        const match = line.match(secretRegex);
        if (match) {
          const secretValue = match[2];
          // Filter out typical environmental placeholders, empty values, or variables
          const isPlaceholder = /^(YOUR_|EXAMPLE_|TEST_|MY_|DUMMY_|$)/i.test(secretValue) || 
                                secretValue.length < 5 ||
                                secretValue.includes('process.env') ||
                                secretValue.includes('${') ||
                                secretValue.includes('dotenv');
          
          if (!isPlaceholder) {
            // Obfuscate secret in log for safety
            const obfuscated = line.replace(secretValue, '********').trim();
            findings.push({
              line: index + 1,
              content: obfuscated,
              message: `Potential hardcoded secret/credential exposed: "${match[1]}"`
            });
          }
        }
      });
      return findings;
    }
  },
  {
    id: 'SEC-003',
    name: 'Insecure HTTP Cookie Configurations',
    description: 'Ensure cookie configurations enforce Secure and HttpOnly flags.',
    severity: 'ERROR',
    match: (content, filePath) => {
      const findings = [];
      const lines = content.split('\n');
      
      const secureFalseRegex = /\bsecure\s*:\s*false\b/i;
      const httpOnlyFalseRegex = /\bhttpOnly\s*:\s*false\b/i;
      
      lines.forEach((line, index) => {
        if (line.includes('security-ignore')) return;

        if (secureFalseRegex.test(line)) {
          findings.push({
            line: index + 1,
            content: line.trim(),
            message: 'Insecure cookie flag: secure explicitly set to false.'
          });
        }
        if (httpOnlyFalseRegex.test(line)) {
          findings.push({
            line: index + 1,
            content: line.trim(),
            message: 'Insecure cookie flag: httpOnly explicitly set to false.'
          });
        }
      });
      return findings;
    }
  }
];

let totalErrors = 0;
let totalWarnings = 0;

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (IGNORE_DIRS.includes(file)) continue;
      walkDir(filePath, callback);
    } else if (stat.isFile()) {
      if (IGNORE_FILES.includes(file)) continue;
      const ext = path.extname(file).toLowerCase();
      if (IGNORE_EXTENSIONS.includes(ext)) continue;
      callback(filePath);
    }
  }
}

console.log('================================================================');
console.log('                 OMNICHAT SECURITY AUDIT SCANNER                ');
console.log('================================================================');
console.log(`Scanning directory: ${ROOT_DIR}`);
console.log('Looking for placeholders, hardcoded credentials & cookie flags...\n');

walkDir(ROOT_DIR, (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(ROOT_DIR, filePath);
    
    RULES.forEach(rule => {
      const findings = rule.match(content, filePath);
      if (findings && findings.length > 0) {
        findings.forEach(finding => {
          const severity = finding.severityOverride || rule.severity;
          const icon = severity === 'ERROR' ? '❌ ERROR' : '⚠️ WARNING';
          
          if (severity === 'ERROR') totalErrors++;
          else totalWarnings++;
          
          console.log(`[${icon}] ${rule.name} (${rule.id})`);
          console.log(`  File:   ${relativePath}:${finding.line}`);
          console.log(`  Line:   ${finding.content}`);
          console.log(`  Reason: ${finding.message}`);
          console.log('----------------------------------------------------------------');
        });
      }
    });
  } catch (err) {
    console.error(`Could not read file ${filePath}: ${err.message}`);
  }
});

console.log('\n================================================================');
console.log('                        SCAN SUMMARY                            ');
console.log('================================================================');
console.log(`Total Errors:   ${totalErrors}`);
console.log(`Total Warnings: ${totalWarnings}`);
console.log('================================================================');

if (totalErrors > 0) {
  console.log('\n❌ Audit failed: High-severity security issues were discovered.');
  process.exit(1);
} else {
  console.log('\n✅ Audit passed: No high-severity security issues found.');
  process.exit(0);
}
