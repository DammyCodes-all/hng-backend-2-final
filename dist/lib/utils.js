import { createCanvas } from "canvas";
import fs from "fs/promises";
import path from "path";
export const fetchCountryData = async () => {
    try {
        const response = await fetch("https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies", { signal: AbortSignal.timeout(10000) });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`restcountries.com: ${error.message}`);
        }
        throw new Error("restcountries.com: Unknown error");
    }
};
export const getExchangeRates = async () => {
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD", {
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.rates;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`open.er-api.com: ${error.message}`);
        }
        throw new Error("open.er-api.com: Unknown error");
    }
};
export const calculateGDP = (population, exchangeRate) => {
    if (!exchangeRate)
        return null;
    const randomMultiplier = Math.random() * (2000 - 1000) + 1000;
    const gdp = (population * randomMultiplier) / exchangeRate;
    return Math.round(gdp * 100) / 100;
};
export const generateSummaryImage = async (totalCountries, topCountries, lastRefreshed) => {
    // Create canvas
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, width, height);
    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Country Data Summary", width / 2, 60);
    // Total Countries
    ctx.font = "28px Arial";
    ctx.fillStyle = "#16c79a";
    ctx.fillText(`Total Countries: ${totalCountries}`, width / 2, 120);
    // Top 5 Countries Header
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText("Top 5 Countries by Estimated GDP:", 50, 180);
    // Top 5 Countries List
    ctx.font = "20px Arial";
    ctx.fillStyle = "#e0e0e0";
    let yPosition = 220;
    topCountries.forEach((country, index) => {
        const gdpValue = country.estimatedGdp
            ? parseFloat(country.estimatedGdp).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
            : "N/A";
        ctx.fillStyle = "#16c79a";
        ctx.fillText(`${index + 1}.`, 70, yPosition);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(country.name, 110, yPosition);
        ctx.fillStyle = "#ffd700";
        ctx.fillText(`$${gdpValue}`, 450, yPosition);
        yPosition += 50;
    });
    // Last Refreshed
    ctx.font = "18px Arial";
    ctx.fillStyle = "#a0a0a0";
    ctx.textAlign = "center";
    const timestamp = lastRefreshed.toISOString();
    ctx.fillText(`Last Refreshed: ${timestamp}`, width / 2, height - 40);
    // Ensure cache directory exists
    const cacheDir = path.join(process.cwd(), "cache");
    await fs.mkdir(cacheDir, { recursive: true });
    // Save image
    const imagePath = path.join(cacheDir, "summary.png");
    const buffer = canvas.toBuffer("image/png");
    await fs.writeFile(imagePath, buffer);
    return imagePath;
};
//# sourceMappingURL=utils.js.map