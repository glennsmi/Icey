import cartesiaService from './cartesiaService';

/**
 * Simple test utility for the Cartesia service
 */
async function testRobVoice() {
  try {
    console.log("Testing Rob voice...");
    
    // Test with Rob's signature phrase
    console.log("Speaking Rob's signature phrase");
    await cartesiaService.speakRobSignaturePhrase();
    
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test automatically when this file is executed directly
if (require.main === module) {
  testRobVoice();
}

export default testRobVoice; 