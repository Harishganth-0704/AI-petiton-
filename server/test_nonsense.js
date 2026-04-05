function testNonsense(text) {
    const cleanText = text.replace(/[^a-z]/g, '').toLowerCase(); // letters only
    const hasVowels = /[aeiouy]/.test(cleanText);
    const isTooShort = text.length < 15;
    const isGibberish = cleanText.length > 5 && !hasVowels;
    const isRepeating = /(.)\1{4,}/.test(text);
    
    const isNonsense = isTooShort || isGibberish || isRepeating;
    
    console.log(`Text: "${text}"`);
    console.log(`- Too Short: ${isTooShort}`);
    console.log(`- Gibberish (No Vowels): ${isGibberish}`);
    console.log(`- Repeating: ${isRepeating}`);
    console.log(`- FINAL RESULT (isNonsense): ${isNonsense}\n`);
}

testNonsense("dsnfsmnksdfns,fnm");
testNonsense("mdnvmdnvmdv mdv");
testNonsense("Water leakage in main road");
testNonsense("தண்ணீர் குழாய் உடைப்பு");
