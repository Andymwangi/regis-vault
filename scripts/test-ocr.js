/**
 * Direct Tesseract OCR test script
 * Run with: node scripts/test-ocr.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');

const execAsync = util.promisify(exec);
const writeFileAsync = util.promisify(fs.writeFile);
const readFileAsync = util.promisify(fs.readFile);
const unlinkAsync = util.promisify(fs.unlink);

// Base64 encoded test image with text "HELLO WORLD"
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAWnSURBVHhe7d3PS1RpHMfx59f4ox01NUkdxEshCC3cFkJ2DYRZWIKLwIUQuy5ciP6DDFrVQjLaudJFSLSLhQjKQgxmwFy0GBjaWc00FYO0NJrvPOd4zjN3zoyjc8Yffb/gA88vc70+53mec76XKCoqOisiIplFvL9FRL6hQEQMFIiIgQIRMVAgIgYKRMRAgYgYKBARAwUiYqBARAwUiIiBbned1+FfzuLunvZs13GlRLp/Lvl+/h4xP3MyfWS7jqt/RRFdH/2QfD9/jycl0v3XzPqJ7e20/pqTHHSLiJjoDiJioDuIn6Ib9fLj2pJc8rZ93VkWkUSHTHR1yqe3vd7G8rx/3yMzL/a9LW+r+9oJz7/s+/Y31uvk+p01ifcg9+jnYR/Z79m0LfKpvVkmvCOOFNXJ7QcbUrW7ICNdWxJ50ig9Pf0S/7MhsWaRvo7H0tiQ74+ZnUaJybKsD1zxtkTqnt+T1RdxiVU0St3ssDxLPQ7U19dLQ0NDcrsQKBCjq2Ob0nzb2+TtjA7K1TaPv3/NkbKtlchkmfQ98o/SfeX25JF0rN+UcCy46MO/V+Xyg/Dv2X26JdW1+4t6OHxfYvWZX5XaB9tSGfp9M6w9bJCa+UlZWejztoLGH7VKMjDXXvTAxR8MnxcEBeJ3/rws9azLXWf7g7bI5T6RUfeCf57xlvWOSeuUf+6xO90lXUeLMT1+l9ye/ewd+yZFLvzM58Yt6Zn0j+F73u9/yOQWF+rKqrSsh///+qP2I3E6Z2c35MpV/xgh8YnFxBe0a6n3LwQFQjdbZaKhQhY7Ur2rLJnuHZKutlbpCPUOmGsUb4fU31v3No5M3I1L41vOKdy8gRc/5Pk9HrrnqZfxhfwLejQxIW0ti+L/zx8KtHvZ9UqvpO4lseMWOLRzvCDBWpAUiAt6qKdNlqRCGp+9kNCpLt2Juhvvj7X0Qs5wd5KwOXl0N+t7Bd70LEvHwrLUdO9IVVtm9zxS9Hm1X65Vy7F0v4oE8kBxEo0bqXe5UCAuqJGuJWnqb5b7ocB9Jb0SKz4tE0PpDlXW3RI3H6Uz5H1Y4UHvchyZmUmXK9+17jYXdB7sSmSoV+qPfGFIyblqKSnx//lvf57FiNT1pSekMlEgbpXpxj/dMiyL0T4Jzz1zc1OTLC2tSnJlWKTyeDcQ2fZH++53W6Qrs+A59c9PS8v6gMQXu0Q+vEp20Thi82nvLLcH5OsJ6cXvpGasnFSamXB2PVRWtxsUeEa/sIrmICIGCkTEQIGIGCgQEQMFImKgQEQMFIiIgQIRMVAgIgYKRMRAgYgY6HbXeR3+5Szu7mmf7TrO3T1dv5N8P3+PmOXu6cyR7Tqu/hXndpfP3+M58z7P3cPNTndVICIGCkTEQHMQP0U36uXHtaVvH6Sbzc6ySCLaKRNdnfLpba+34XHPJfrmB7wt77j/vuc8/7Lv299Yr/vmebjZj5m9H+HH0acfK5vt8fW5nj/XcWfvR3o7M3S7K3pQIOd1+JfjZLuOy3X4l0+262QKJNdxmSgQEQPNQURMNEk/r8O/HCfbdVyu7/l037cPAP52nO6iIgYKRMRAgYgYKBARAwUiYqBARAwUiIiBvgeBaC6+B4GI5uLZ6S4qYqC7qJx9+KWZnZ0iXxSn2weeqbeTvlT6/XSHP13+m9T34/8RBSKS9wR/OnxoUkNFRUUXw4UWFIrvLYqIKBCRLBSIiIECETFQICIGCkTEQIGIGCgQEQMFImKgQEQMFIiIgQIRMVAgIgYKRMRAgYgYKBARAwUiYqBARAwUiIiBvkmXnPT3Xn+TLpIDBeH3PyciBvrKXeTb40REDHQHETHQv/oVydF/qGGjgV0LPVAAAAAASUVORK5CYII=';

// Create a temporary test image
async function createTestImage() {
  const tmpDir = os.tmpdir();
  const imagePath = path.join(tmpDir, 'direct-tesseract-test.png');
  
  try {
    // Convert base64 to binary
    const imageBuffer = Buffer.from(testImageBase64, 'base64');
    await writeFileAsync(imagePath, imageBuffer);
    console.log(`Created test image at: ${imagePath}`);
    return imagePath;
  } catch (error) {
    console.error('Error creating test image:', error);
    throw error;
  }
}

// Run direct command-line Tesseract OCR
async function runDirectTesseractOCR(imagePath) {
  try {
    const outputBase = path.join(os.tmpdir(), 'tesseract-direct-output').replace(/\\/g, '/');
    const command = `tesseract "${imagePath.replace(/\\/g, '/')}" "${outputBase}" -l eng --psm 3 --oem 1`;
    
    console.log(`Running direct Tesseract command: ${command}`);
    
    // Execute tesseract command
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log('Tesseract stdout:', stdout);
    if (stderr) console.log('Tesseract stderr:', stderr);
    
    // Read the output file
    const outputPath = `${outputBase}.txt`;
    console.log(`Reading OCR result from: ${outputPath}`);
    const text = await readFileAsync(outputPath, 'utf8');
    
    // Clean up
    await unlinkAsync(imagePath).catch(() => {});
    await unlinkAsync(outputPath).catch(() => {});
    
    return text.trim();
  } catch (error) {
    console.error('Direct Tesseract OCR failed:', error);
    throw error;
  }
}

// Main test function
async function testDirectTesseractOCR() {
  console.log('\n=== DIRECT TESSERACT OCR TEST ===\n');
  
  try {
    // Test system tesseract installation
    console.log('Step 1: Checking Tesseract installation...');
    const versionResult = await execAsync('tesseract --version');
    console.log(`✅ Tesseract found: ${versionResult.stdout.split('\n')[0]}`);
    
    // Test OCR on a known image
    console.log('\nStep 2: Running OCR test with direct Tesseract command...');
    const imagePath = await createTestImage();
    const ocrText = await runDirectTesseractOCR(imagePath);
    
    console.log(`\nOCR Result: "${ocrText}"`);
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    console.log('✅ Tesseract OCR is working correctly on your system!');
    console.log('\nThis confirms that the system Tesseract integration works,');
    console.log('and your application should now be able to use the direct Tesseract approach.');
    
  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error('❌ Tesseract OCR test failed with error:', error);
    console.error('\nPossible issues:');
    console.error('1. Tesseract is not installed correctly');
    console.error('2. Tesseract is not in the PATH environment variable');
    console.error('3. Missing language packs or permissions issues');
    
    console.error('\nRecommendations:');
    console.error('1. Verify Tesseract is installed: Go to https://github.com/UB-Mannheim/tesseract/wiki');
    console.error('2. Make sure to run the installer as Administrator');
    console.error('3. Check the "Add to PATH" option during installation');
    console.error('4. Restart your computer after installation');
    console.error('5. Open a NEW command prompt and verify with "tesseract --version"');
  }
}

// Run the test
testDirectTesseractOCR(); 