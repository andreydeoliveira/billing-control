-- Add optional end month for recurring forecasts
ALTER TABLE "Forecast" ADD COLUMN "endsAt" DATETIME;

-- Add optional end month for recurring income forecasts
ALTER TABLE "IncomeForecast" ADD COLUMN "endsAt" DATETIME;
