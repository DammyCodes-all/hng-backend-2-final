import express from "express";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { countries, metadata } from "./db/schema.js";
import {
  fetchCountryData,
  getExchangeRates,
  calculateGDP,
  generateSummaryImage,
} from "./lib/utils.js";
import { eq, desc, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import path from "path";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = drizzle(connection);

app.get("/", async (req, res) => {
  try {
    const [rows] = await db.select().from(countries).limit(1);
    res.json(rows);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.post("/countries/refresh", async (req, res) => {
  try {
    // Fetch data from external APIs
    let countryList, exchangeData;
    try {
      [countryList, exchangeData] = await Promise.all([
        fetchCountryData(),
        getExchangeRates(),
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      let apiName = "external API";

      if (errorMessage.includes("restcountries.com")) {
        apiName = "restcountries.com";
      } else if (errorMessage.includes("open.er-api.com")) {
        apiName = "open.er-api.com";
      }

      return res.status(503).json({
        error: "External data source unavailable",
        details: `Could not fetch data from ${apiName}`,
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const now = new Date();

    for (const country of countryList) {
      const country_currency_code = country?.currencies?.[0]?.code || null;

      // Determine exchange rate and GDP based on currency availability
      let currency_rate: number | null = null;
      let estimatedGdp: number | null = null;

      if (country_currency_code) {
        currency_rate = exchangeData[country_currency_code] || null;
        estimatedGdp = calculateGDP(country.population, currency_rate);
      } else {
        estimatedGdp = 0;
      }

      const countryData: typeof countries.$inferInsert = {
        name: country.name,
        capital: country.capital || null,
        region: country.region || null,
        population: country.population,
        flagUrl: country.flag || null,
        currencyCode: country_currency_code,
        exchangeRate: currency_rate?.toString() || null,
        estimatedGdp: estimatedGdp !== null ? estimatedGdp.toString() : null,
        lastRefreshedAt: now,
      };

      const existingCountry = await db
        .select()
        .from(countries)
        .where(sql`LOWER(${countries.name}) = LOWER(${country.name})`)
        .limit(1);

      if (existingCountry.length > 0 && existingCountry[0]) {
        await db
          .update(countries)
          .set({
            capital: countryData.capital,
            region: countryData.region,
            population: countryData.population,
            flagUrl: countryData.flagUrl,
            currencyCode: countryData.currencyCode,
            exchangeRate: countryData.exchangeRate,
            estimatedGdp: countryData.estimatedGdp,
            lastRefreshedAt: now,
          })
          .where(eq(countries.id, existingCountry[0].id));
        updatedCount++;
      } else {
        await db.insert(countries).values(countryData);
        insertedCount++;
      }
    }

    // Update metadata with global last_refreshed_at timestamp
    await db
      .insert(metadata)
      .values({
        id: 1,
        totalCountries: countryList.length,
        lastRefreshedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          totalCountries: countryList.length,
          lastRefreshedAt: now,
        },
      });

    // Generate summary image
    try {
      // Get top 5 countries by estimated GDP
      const topCountries = await db
        .select({
          name: countries.name,
          estimatedGdp: countries.estimatedGdp,
        })
        .from(countries)
        .where(sql`${countries.estimatedGdp} IS NOT NULL`)
        .orderBy(desc(countries.estimatedGdp))
        .limit(5);

      // Generate the image
      const imagePath = await generateSummaryImage(
        countryList.length,
        topCountries,
        now
      );

      // Update metadata with image path
      await db
        .update(metadata)
        .set({
          summaryImagePath: "cache/summary.png",
        })
        .where(eq(metadata.id, 1));

      console.log(`Summary image generated at: ${imagePath}`);
    } catch (imageError) {
      console.error("Failed to generate summary image:", imageError);
      // Don't fail the entire refresh if image generation fails
    }

    console.log(`Inserted: ${insertedCount}, Updated: ${updatedCount}`);
    res.json({
      message: "Country data refreshed successfully",
      inserted: insertedCount,
      updated: updatedCount,
      total: countryList.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/countries", async (req, res) => {
  try {
    const { region, currency, sort } = req.query;

    let query = db.select().from(countries);

    const conditions = [];

    if (region && typeof region === "string") {
      conditions.push(sql`${countries.region} = ${region}`);
    }

    if (currency && typeof currency === "string") {
      conditions.push(sql`${countries.currencyCode} = ${currency}`);
    }

    if (conditions.length > 0) {
      query = query.where(
        conditions.reduce((acc, condition) => sql`${acc} AND ${condition}`)
      ) as any;
    }

    // Apply sorting
    if (sort && typeof sort === "string") {
      switch (sort.toLowerCase()) {
        case "gdp_desc":
          query = query.orderBy(desc(countries.estimatedGdp)) as any;
          break;
        case "gdp_asc":
          query = query.orderBy(asc(countries.estimatedGdp)) as any;
          break;
        case "population_desc":
          query = query.orderBy(desc(countries.population)) as any;
          break;
        case "population_asc":
          query = query.orderBy(asc(countries.population)) as any;
          break;
        case "name_asc":
          query = query.orderBy(asc(countries.name)) as any;
          break;
        case "name_desc":
          query = query.orderBy(desc(countries.name)) as any;
          break;
        default:
          // Default sorting by name ascending
          query = query.orderBy(asc(countries.name)) as any;
      }
    } else {
      // Default sorting by name ascending
      query = query.orderBy(asc(countries.name)) as any;
    }

    const results = await query;

    // Format the response to match the expected output
    const formattedResults = results.map((country) => ({
      id: country.id,
      name: country.name,
      capital: country.capital,
      region: country.region,
      population: country.population,
      currency_code: country.currencyCode,
      exchange_rate: country.exchangeRate
        ? parseFloat(country.exchangeRate)
        : null,
      estimated_gdp: country.estimatedGdp
        ? parseFloat(country.estimatedGdp)
        : null,
      flag_url: country.flagUrl,
      last_refreshed_at: country.lastRefreshedAt
        ? country.lastRefreshedAt.toISOString()
        : null,
    }));
    if (formattedResults.length === 0) {
      return res
        .status(404)
        .json({ error: "No countries found matching the criteria" });
    }
    res.json(formattedResults);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/countries/image", async (req, res) => {
  try {
    const imagePath = path.join(process.cwd(), "cache", "summary.png");

    // Check if file exists
    try {
      await import("fs/promises").then((fs) => fs.access(imagePath));
    } catch {
      return res.status(404).json({ error: "Summary image not found" });
    }

    // Serve the image
    res.sendFile(imagePath);
  } catch (error) {
    console.error("Error serving image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/status", async (req, res) => {
  try {
    // Get metadata from database
    const metadataResult = await db
      .select({
        totalCountries: metadata.totalCountries,
        lastRefreshedAt: metadata.lastRefreshedAt,
      })
      .from(metadata)
      .where(eq(metadata.id, 1))
      .limit(1);

    // If no metadata exists yet
    if (metadataResult.length === 0 || !metadataResult[0]) {
      return res.json({
        total_countries: 0,
        last_refreshed_at: null,
      });
    }

    const meta = metadataResult[0];

    res.json({
      total_countries: meta.totalCountries || 0,
      last_refreshed_at: meta.lastRefreshedAt
        ? meta.lastRefreshedAt.toISOString()
        : null,
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/countries/:name", async (req, res) => {
  try {
    const { name } = req.params;

    // Decode URL-encoded name (e.g., "United%20States" -> "United States")
    const decodedName = decodeURIComponent(name);

    // Query database with case-insensitive match
    const result = await db
      .select()
      .from(countries)
      .where(sql`LOWER(${countries.name}) = LOWER(${decodedName})`)
      .limit(1);

    if (result.length === 0 || !result[0]) {
      return res.status(404).json({ error: "Country not found" });
    }

    const country = result[0];
    const formattedCountry = {
      id: country.id,
      name: country.name,
      capital: country.capital,
      region: country.region,
      population: country.population,
      currency_code: country.currencyCode,
      exchange_rate: country.exchangeRate
        ? parseFloat(country.exchangeRate)
        : null,
      estimated_gdp: country.estimatedGdp
        ? parseFloat(country.estimatedGdp)
        : null,
      flag_url: country.flagUrl,
      last_refreshed_at: country.lastRefreshedAt
        ? country.lastRefreshedAt.toISOString()
        : null,
    };

    res.json(formattedCountry);
  } catch (error) {
    console.error("Error fetching country:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/countries/:name", async (req, res) => {
  try {
    const { name } = req.params;

    // Decode URL-encoded name
    const decodedName = decodeURIComponent(name);

    // Check if country exists first
    const existingCountry = await db
      .select()
      .from(countries)
      .where(sql`LOWER(${countries.name}) = LOWER(${decodedName})`)
      .limit(1);

    if (existingCountry.length === 0 || !existingCountry[0]) {
      return res.status(404).json({ error: "Country not found" });
    }

    // Delete the country
    await db.delete(countries).where(eq(countries.id, existingCountry[0].id));

    res.json({
      message: "Country deleted successfully",
      name: existingCountry[0].name,
    });
  } catch (error) {
    console.error("Error deleting country:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
