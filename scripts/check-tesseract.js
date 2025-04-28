/**
 * Tesseract Installation Verification Script
 * 
 * This script checks if Tesseract OCR is properly installed and configured on the system.
 * Run with: node scripts/check-tesseract.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Function to run a command and return its output
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Create a temporary test image
async function createTestImage() {
  const tmpDir = os.tmpdir();
  const imagePath = path.join(tmpDir, 'tesseract-test.png');
  
  // Simple test image with text "OCR TEST"
  const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAMgAAAAyCAYAAAAZUZThAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJSSURBVHhe7dq/SxthGMfx909xcVAQJ/+AghBwCAhODg5OOoiLdKiLi+BSEAeHgkMdpODg4BAQHAJCxcFB6JCCODgECg4HzvL9Pve8vLm7RLzEaHOfD3zwvXtzzRve5574AIiIiIiIiIiIiIiIiIjOkuXlZTs4OPCOfrTZ2Vk7PDz0dh/98eLFCzs6OvKeP0tDQ0O2srLS08fZvb29R9cQUOLU1JQfB1hfX/e1xuPHXl5e9sc+efLELi4ufK3xerGGgBKXlpZsbW3Nr/lzVVxcXPT13d3ddl3b+sjIiB+jra+v+9r09LQf+8XGxoavxXIeBTUElEh2YGCgrXfp+Pj4xJ5vb29bx5VKJT82yPzc3JyvbW1t+bEv1tfXfe3Zs2d+7As1BJRIlvnp6Wlfb73PEBpHaF2hT5LQzc2NHxv0GaE1+iIEMp9IJNrWEFAi2UtLS76+ubkZy7iy1djzxsZG7DGhm3+S0KWlpdi+8BMCWU+n021rCCiRbE3T/DoEJhQxzLPZ7F+FMcxPTk762vz8vC81zJeXl30tl8v5sV9kMhk/5nK5tjUElEi2XC77eihjmGtEt7a2YuXx8XFfCvP19XVf0xmkUqn4WnhXXl1d9WO/0JnK15LJZNsaAkokazKZ9PVaxnw+H3tOuL7VunPz/v6+r4UzhwKpM4evJZPJrmsIKJHs1NSUr9dbWVmJ7Xm9UChYtVr1+5pM6L5CfWZmxtfDTaOZTMZqtZrfr6+Hm0r1i4lw5uj1MQQUEBERERERERERERERERER/QPM/gCMavPQDq7ORAAAAABJRU5ErkJggg==';
  
  try {
    // Convert base64 to binary
    const imageBuffer = Buffer.from(base64Image, 'base64');
    fs.writeFileSync(imagePath, imageBuffer);
    console.log(`Created test image at: ${imagePath}`);
    return imagePath;
  } catch (error) {
    console.error('Error creating test image:', error);
    throw error;
  }
}

// Run OCR on a test image
async function testOCR(imagePath) {
  const outputBase = path.join(os.tmpdir(), 'tesseract-output');
  
  try {
    // Run tesseract on the test image
    await runCommand(`tesseract "${imagePath}" "${outputBase}" -l eng`);
    
    // Read the output file
    const outputPath = `${outputBase}.txt`;
    const ocrText = fs.readFileSync(outputPath, 'utf8').trim();
    
    // Clean up
    fs.unlinkSync(imagePath);
    fs.unlinkSync(outputPath);
    
    return ocrText;
  } catch (error) {
    console.error('OCR test failed:', error);
    throw error;
  }
}

// Main verification function
async function verifyTesseractInstallation() {
  console.log('\n=== Tesseract OCR Installation Verification ===\n');
  
  try {
    // Step 1: Check if tesseract is available on PATH
    console.log('Step 1: Checking if tesseract is available on PATH...');
    const versionOutput = await runCommand('tesseract --version');
    console.log(`✅ Tesseract found: ${versionOutput.split('\n')[0]}`);
    
    // Step 2: Check available languages
    console.log('\nStep 2: Checking available language packs...');
    const languagesOutput = await runCommand('tesseract --list-langs');
    console.log(`✅ Languages available: ${languagesOutput.split('\n').join(', ')}`);
    
    // Step 3: Run a test OCR
    console.log('\nStep 3: Running a test OCR on a sample image...');
    const imagePath = await createTestImage();
    const ocrText = await testOCR(imagePath);
    console.log(`✅ OCR test completed. Extracted text: "${ocrText}"`);
    
    // Overall result
    console.log('\n=== VERIFICATION RESULT ===');
    console.log('✅ SUCCESS: Tesseract OCR is properly installed and working!\n');
    console.log('The OCR functionality in your application should now work correctly.');
    console.log('If you still encounter issues, please check the application logs for specific errors.');
    
  } catch (error) {
    console.log('\n=== VERIFICATION RESULT ===');
    console.log('❌ ERROR: Tesseract OCR installation verification failed!');
    console.log('\nPossible issues:');
    console.log('1. Tesseract is not installed correctly');
    console.log('2. Tesseract is not added to your system PATH');
    console.log('3. Required language packs are not installed');
    
    console.log('\nPlease follow these steps:');
    console.log('1. Install Tesseract OCR from: https://github.com/UB-Mannheim/tesseract/wiki');
    console.log('2. Make sure to select "Add to PATH" during installation');
    console.log('3. Install at least the English language pack');
    console.log('4. Restart your computer to ensure PATH changes take effect');
    console.log('5. Run this script again to verify the installation');
    
    console.log('\nFor detailed instructions, see: src/components/ocr/TROUBLESHOOTING.md');
  }
}

// Run the verification
verifyTesseractInstallation(); 