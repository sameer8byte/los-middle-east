import * as bcrypt from 'bcrypt';

/**
 * Simple test script to verify bcrypt functionality
 * Run with: ts-node scripts/test-bcrypt.ts
 */

async function testBcryptFunctionality() {
  console.log('🧪 Testing bcrypt functionality...');
  
  const plainPassword = 'TestPassword123!';
  console.log(`📝 Plain text password: ${plainPassword}`);
  
  try {
    // Test hashing
    console.log('\n🔐 Testing password hashing...');
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    console.log(`✅ Hashed password: ${hashedPassword}`);
    console.log(`📏 Hash length: ${hashedPassword.length} characters`);
    console.log(`🔍 Hash starts with $2b$: ${hashedPassword.startsWith('$2b$')}`);
    
    // Test comparison with correct password
    console.log('\n✅ Testing correct password comparison...');
    const isValidCorrect = await bcrypt.compare(plainPassword, hashedPassword);
    console.log(`🔓 Correct password matches: ${isValidCorrect}`);
    
    // Test comparison with incorrect password
    console.log('\n❌ Testing incorrect password comparison...');
    const wrongPassword = 'WrongPassword123!';
    const isValidWrong = await bcrypt.compare(wrongPassword, hashedPassword);
    console.log(`🔒 Wrong password matches: ${isValidWrong}`);
    
    // Test multiple hashes of same password are different
    console.log('\n🔄 Testing unique salt generation...');
    const hash1 = await bcrypt.hash(plainPassword, 12);
    const hash2 = await bcrypt.hash(plainPassword, 12);
    console.log(`🎲 Hash 1: ${hash1}`);
    console.log(`🎲 Hash 2: ${hash2}`);
    console.log(`🔄 Hashes are different: ${hash1 !== hash2}`);
    console.log(`✅ Both hashes validate: ${await bcrypt.compare(plainPassword, hash1) && await bcrypt.compare(plainPassword, hash2)}`);
    
    // Performance test
    console.log('\n⏱️  Performance test...');
    const startTime = Date.now();
    await bcrypt.hash(plainPassword, 12);
    const endTime = Date.now();
    console.log(`🚀 Hash generation time: ${endTime - startTime}ms`);
    
    console.log('\n🎉 All bcrypt tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Bcrypt test failed:', error);
    process.exit(1);
  }
}

// Additional helper function to demonstrate password strength checking
function checkPasswordStrength(password: string): { isStrong: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (password.length < 8) {
    issues.push('Password should be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    issues.push('Password should contain lowercase letters');
  }
  
  if (!/[A-Z]/.test(password)) {
    issues.push('Password should contain uppercase letters');
  }
  
  if (!/\d/.test(password)) {
    issues.push('Password should contain numbers');
  }
  
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    issues.push('Password should contain special characters');
  }
  
  return {
    isStrong: issues.length === 0,
    issues
  };
}

async function testPasswordStrength() {
  console.log('\n🛡️  Testing password strength validation...');
  
  const testPasswords = [
    'weak',
    'StrongPass123!',
    'NoNumbers!',
    'nonumbers123!',
    'NOLOWERCASE123!',
    'NoSpecialChars123'
  ];
  
  testPasswords.forEach(password => {
    const strength = checkPasswordStrength(password);
    console.log(`\n📋 Password: "${password}"`);
    console.log(`💪 Strong: ${strength.isStrong ? '✅' : '❌'}`);
    if (!strength.isStrong) {
      console.log(`📝 Issues: ${strength.issues.join(', ')}`);
    }
  });
}

// Run tests
testBcryptFunctionality()
  .then(() => testPasswordStrength())
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
