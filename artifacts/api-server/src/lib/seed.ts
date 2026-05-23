import bcrypt from "bcryptjs";
import { db, usersTable, shipmentsTable, cryptoWalletsTable, portActivityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export async function seed() {
  try {
    // Admin user
    const adminEmail = process.env.ADMIN_EMAIL ?? "admin@tradebox.io";
    const adminPassword = process.env.ADMIN_PASSWORD ?? "TradeBoxAdmin2025!";
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
    if (existing.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await db.insert(usersTable).values({
        email: adminEmail,
        passwordHash: hash,
        traderId: "TB-0001",
        guildCode: "TB-GUILD-ADMIN",
        role: "admin",
        kycStatus: "approved",
        balance: "0",
      });
      logger.info("Admin user created");
    }

    // Demo user
    const demoEmail = "demo@tradebox.io";
    const demoExisting = await db.select().from(usersTable).where(eq(usersTable.email, demoEmail)).limit(1);
    if (demoExisting.length === 0) {
      const hash = await bcrypt.hash("Demo1234!", 12);
      await db.insert(usersTable).values({
        email: demoEmail,
        passwordHash: hash,
        traderId: "TB-1042",
        guildCode: "TB-GUILD-DEMO1",
        role: "user",
        kycStatus: "approved",
        balance: "12500.00",
        totalDeposited: "15000.00",
      });
      logger.info("Demo user created");
    }

    // Crypto wallets
    const walletCount = await db.select().from(cryptoWalletsTable);
    if (walletCount.length === 0) {
      await db.insert(cryptoWalletsTable).values([
        { coin: "BTC", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", network: "Bitcoin" },
        { coin: "ETH", address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", network: "Ethereum (ERC-20)" },
        { coin: "USDT", address: "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7", network: "TRON (TRC-20)" },
        { coin: "BNB", address: "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2", network: "BEP-20" },
        { coin: "TRX", address: "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7", network: "TRON" },
      ]);
      logger.info("Crypto wallets seeded");
    }

    // Shipments
    const shipmentCount = await db.select().from(shipmentsTable);
    if (shipmentCount.length === 0) {
      const now = new Date();
      const d = (days: number) => new Date(now.getTime() + days * 86400000);

      await db.insert(shipmentsTable).values([
        {
          title: "Consumer Electronics — Shenzhen Batch Q2",
          cargoType: "electronics",
          origin: "Shenzhen, China",
          destination: "Rotterdam, Netherlands",
          originCoords: "22.5431,114.0579",
          destinationCoords: "51.9244,4.4777",
          profitPercent: "14.5",
          riskGrade: "A",
          fundingGoal: "250000",
          fundingRaised: "187500",
          minInvestment: "500",
          departureDate: d(-10),
          arrivalDate: d(18),
          transitDays: 28,
          status: "in_transit",
          freightForwarder: "Maersk Line Ltd",
          vesselName: "MSC OSCAR",
          hsCode: "8471.30",
          weightTons: "1250",
          volumeCbm: "4800",
          description: "Premium consumer electronics including laptops, smartphones and accessories. Grade A cargo with full insurance coverage.",
          isFeatured: 1,
        },
        {
          title: "Premium Cocoa Beans — Ivory Coast Export",
          cargoType: "cocoa",
          origin: "Abidjan, Ivory Coast",
          destination: "Hamburg, Germany",
          originCoords: "5.3600,-4.0083",
          destinationCoords: "53.5753,10.0153",
          profitPercent: "18.2",
          riskGrade: "B",
          fundingGoal: "120000",
          fundingRaised: "96000",
          minInvestment: "250",
          departureDate: d(-5),
          arrivalDate: d(12),
          transitDays: 17,
          status: "in_transit",
          freightForwarder: "CMA CGM Group",
          vesselName: "EVER GIVEN II",
          hsCode: "1801.00",
          weightTons: "800",
          volumeCbm: "1200",
          description: "Certified Grade 1 cocoa beans sourced from certified farms in Ivory Coast. Full phytosanitary documentation.",
        },
        {
          title: "Lithium Battery Cells — EV Supply Chain",
          cargoType: "lithium",
          origin: "Guangzhou, China",
          destination: "Los Angeles, USA",
          originCoords: "23.1291,113.2644",
          destinationCoords: "33.9425,-118.4081",
          profitPercent: "21.0",
          riskGrade: "B",
          fundingGoal: "400000",
          fundingRaised: "140000",
          minInvestment: "1000",
          departureDate: d(5),
          arrivalDate: d(23),
          transitDays: 18,
          status: "open",
          freightForwarder: "Evergreen Marine Corp",
          vesselName: "COSCO SHIPPING UNIVERSE",
          hsCode: "8507.60",
          weightTons: "2100",
          volumeCbm: "3600",
          description: "LFP battery cells for EV manufacturers. Hazmat certified packaging. UN38.3 tested.",
        },
        {
          title: "Arabica Coffee — Colombian Highlands",
          cargoType: "coffee",
          origin: "Barranquilla, Colombia",
          destination: "Antwerp, Belgium",
          originCoords: "10.9878,-74.7889",
          destinationCoords: "51.2213,4.4051",
          profitPercent: "15.8",
          riskGrade: "A",
          fundingGoal: "80000",
          fundingRaised: "60000",
          minInvestment: "200",
          departureDate: d(3),
          arrivalDate: d(19),
          transitDays: 16,
          status: "open",
          freightForwarder: "Hapag-Lloyd AG",
          vesselName: "SANTA ISABEL",
          hsCode: "0901.11",
          weightTons: "320",
          volumeCbm: "640",
          description: "Single-origin Arabica from Huila region. Q-graded 86+ specialty. Fair Trade certified.",
        },
        {
          title: "Technical Textiles — Bangladesh Garments",
          cargoType: "textiles",
          origin: "Chittagong, Bangladesh",
          destination: "Felixstowe, UK",
          originCoords: "22.3419,91.8152",
          destinationCoords: "51.9563,1.3510",
          profitPercent: "12.0",
          riskGrade: "A",
          fundingGoal: "60000",
          fundingRaised: "18000",
          minInvestment: "150",
          departureDate: d(8),
          arrivalDate: d(30),
          transitDays: 22,
          status: "open",
          freightForwarder: "ONE (Ocean Network Express)",
          vesselName: "HYUNDAI LOYALTY",
          hsCode: "6203.42",
          weightTons: "420",
          volumeCbm: "1800",
          description: "Premium ready-made garments. GOTS certified. Buyer confirmed orders from major UK retailers.",
        },
        {
          title: "Pharmaceutical APIs — Indian Export",
          cargoType: "pharmaceuticals",
          origin: "Mumbai, India",
          destination: "New York, USA",
          originCoords: "19.0760,72.8777",
          destinationCoords: "40.6413,-73.7781",
          profitPercent: "19.5",
          riskGrade: "C",
          fundingGoal: "300000",
          fundingRaised: "75000",
          minInvestment: "750",
          departureDate: d(12),
          arrivalDate: d(34),
          transitDays: 22,
          status: "open",
          freightForwarder: "Mediterranean Shipping Co",
          vesselName: "MSC LORETO",
          hsCode: "2941.10",
          weightTons: "180",
          volumeCbm: "260",
          description: "Active Pharmaceutical Ingredients for US distributor. GDP-compliant cold chain. FDA import permit obtained.",
        },
      ]);
      logger.info("Shipments seeded");
    }

    // Port activity
    const portCount = await db.select().from(portActivityTable);
    if (portCount.length === 0) {
      const ports = [
        { portName: "Port of Rotterdam", country: "Netherlands", eventType: "arrival" as const, vesselName: "MSC OSCAR", cargoType: "electronics" },
        { portName: "Port of Shanghai", country: "China", eventType: "departure" as const, vesselName: "EVER GIVEN II", cargoType: "textiles" },
        { portName: "Port of Singapore", country: "Singapore", eventType: "arrival" as const, vesselName: "COSCO SHIPPING UNIVERSE", cargoType: "lithium" },
        { portName: "Port of Hamburg", country: "Germany", eventType: "departure" as const, vesselName: "HYUNDAI LOYALTY", cargoType: "cocoa" },
        { portName: "Port of Los Angeles", country: "USA", eventType: "arrival" as const, vesselName: "SANTA ISABEL", cargoType: "coffee" },
        { portName: "Jawaharlal Nehru Port", country: "India", eventType: "departure" as const, vesselName: "MSC LORETO", cargoType: "pharmaceuticals" },
        { portName: "Port of Antwerp", country: "Belgium", eventType: "arrival" as const, vesselName: "ONE HARMONY", cargoType: "steel" },
        { portName: "Port of Busan", country: "South Korea", eventType: "departure" as const, vesselName: "HMM ALGECIRAS", cargoType: "electronics" },
      ];
      const now = new Date();
      for (let i = 0; i < ports.length; i++) {
        await db.insert(portActivityTable).values({
          ...ports[i],
          timestamp: new Date(now.getTime() - i * 3600000 * 2),
        });
      }
      logger.info("Port activity seeded");
    }

    logger.info("Database seed complete");
  } catch (err) {
    logger.error({ err }, "Seed error");
  }
}
