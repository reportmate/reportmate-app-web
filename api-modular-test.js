const ModularDataProcessor = require('./lib/modular-data-processor');

// Database connection string
const CONNECTION_STRING = "postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require";

// Initialize the modular data processor
const dataProcessor = new ModularDataProcessor(CONNECTION_STRING);

async function main() {
    try {
        console.log("🚀 Starting ReportMate Modular API Server");
        console.log("📊 Enforcing strict modular data architecture:");
        console.log("   • 1 table per JSON module");
        console.log("   • Serial number + Device ID uniqueness");
        console.log("   • Event type validation (success, warning, error, info, system only)");
        console.log("");

        // Example unified payload processing (for testing)
        const testPayload = {
            deviceInfo: {
                serialNumber: "TEST123",
                deviceId: "test-device-uuid",
                name: "Test Device",
                model: "Test Model",
                manufacturer: "Test Manufacturer",
                os: "Windows 11",
                osName: "Windows",
                osVersion: "11.0.22000",
                processor: "Intel i7",
                memory: "16GB",
                architecture: "x64"
            },
            moduleData: {
                system: {
                    computerName: "TEST-PC",
                    domain: "test.local",
                    uptime: "1 day, 2 hours"
                },
                hardware: {
                    manufacturer: "Test Manufacturer",
                    model: "Test Model",
                    processor: {
                        name: "Intel i7",
                        cores: 8,
                        speed: 3.2
                    }
                }
            },
            metadata: [
                {
                    eventType: "info",
                    message: "Test data collection successful",
                    details: {
                        modules: ["system", "hardware"],
                        timestamp: new Date().toISOString()
                    }
                }
            ]
        };

        // Test the processor
        console.log("🧪 Testing modular data processing...");
        const result = await dataProcessor.processUnifiedPayload(testPayload);
        console.log("✅ Test result:", result);

        console.log("\n📦 Modular Data Processor is ready!");
        console.log("   • Use processUnifiedPayload() for incoming data");
        console.log("   • Use getDeviceData(serialNumber) to retrieve data");
        console.log("   • Use getDevicesList() for device listings");

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

// Export for use in other modules
module.exports = {
    dataProcessor,
    CONNECTION_STRING
};

// Run if this file is executed directly
if (require.main === module) {
    main();
}
