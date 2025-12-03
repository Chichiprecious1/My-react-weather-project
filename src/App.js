// src/App.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./style.css";

// Format local city time using OpenWeather dt + timezone (seconds offset from UTC)
function formatCityTime(dt, timezoneOffset) {
  if (!dt || timezoneOffset === undefined || timezoneOffset === null) {
    return "";
  }

  // Create a Date based on city local time:
  // dt is UTC, timezoneOffset shifts it to the city's local time
  const local = new Date((dt + timezoneOffset) * 1000);

  // Use UTC getters so we don't apply *your* local timezone a second time
  const hours = local.getUTCHours();
  const minutes = local.getUTCMinutes();
  const dayIndex = local.getUTCDay();

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const day = days[dayIndex];

  const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const paddedHours = hours < 10 ? `0${hours}` : hours;

  return `${day} ${paddedHours}:${paddedMinutes}`;
}

// Format day name for the small forecast cards
function formatForecastDay(dt, timezoneOffset) {
  const local = new Date((dt + timezoneOffset) * 1000);
  const dayIndex = local.getUTCDay();
  const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return daysShort[dayIndex];
}

// Pick a cute emoji based on OpenWeather icon / weather
function getWeatherEmoji(iconCode, main, description) {
  const lower = (description || "").toLowerCase();

  const isDay = iconCode && iconCode.endsWith("d");
  const code = iconCode || "";

  // Clear sky
  if (code.startsWith("01")) {
    return isDay ? "☀️" : "🌙";
  }

  // Few / scattered clouds
  if (code.startsWith("02") || code.startsWith("03")) {
    return isDay ? "🌤️" : "☁️";
  }

  // Broken / overcast clouds
  if (code.startsWith("04")) {
    return "☁️";
  }

  // Drizzle / rain
  if (
    code.startsWith("09") ||
    code.startsWith("10") ||
    lower.includes("rain")
  ) {
    return isDay ? "🌦️" : "🌧️";
  }

  // Thunderstorm
  if (code.startsWith("11") || lower.includes("thunder")) {
    return "⛈️";
  }

  // Snow
  if (code.startsWith("13") || lower.includes("snow")) {
    return "❄️";
  }

  // Mist / fog / haze
  if (
    code.startsWith("50") ||
    lower.includes("mist") ||
    lower.includes("fog") ||
    lower.includes("haze")
  ) {
    return "🌫️";
  }

  // Fallback
  if (isDay) return "🌈";
  return "⭐";
}

export default function App() {
  const [city, setCity] = useState("Philadelphia");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // For soft animation on the big icon
  const [pulse, setPulse] = useState(true);

  const apiKey = "ab8e7ef210556986d1c9a75d6007b825"; // OpenWeather key

  useEffect(() => {
    const id = setInterval(() => {
      setPulse((p) => !p);
    }, 800); // gentle bobbing
    return () => clearInterval(id);
  }, []);

  // Fetch current weather from OpenWeather
  function searchCity(cityName) {
    if (!cityName) return;

    setIsLoading(true);

    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}&units=metric`;

    axios
      .get(currentUrl)
      .then((response) => {
        const data = response.data;

        setWeather({
          city: data.name,
          temperature: Math.round(data.main.temp),
          description: data.weather[0].description,
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed),
          dt: data.dt,
          timezone: data.timezone,
          iconCode: data.weather[0].icon,
          main: data.weather[0].main,
        });

        // After current weather, fetch forecast
        getForecast(cityName);
      })
      .catch((error) => {
        console.error(error);
        alert("Could not find that city. Please try again 🥺");
        setIsLoading(false);
      });
  }

  // Fetch 5 upcoming forecast periods from OpenWeather
  function getForecast(cityName) {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${apiKey}&units=metric`;

    axios
      .get(forecastUrl)
      .then((response) => {
        // Just take the next 5 forecast items
        const items = response.data.list.slice(0, 5);
        setForecast(
          items.map((item) => ({
            dt: item.dt,
            tempMin: Math.round(item.main.temp_min),
            tempMax: Math.round(item.main.temp_max),
            iconCode: item.weather[0].icon,
            main: item.weather[0].main,
            description: item.weather[0].description,
            timezone: response.data.city.timezone,
          }))
        );
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!city.trim()) return;
    searchCity(city.trim());
  }

  // Load default city on first render
  useEffect(() => {
    searchCity("Philadelphia");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="weather-app">
      <header>
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            type="search"
            placeholder="Enter a city.."
            required
            className="search-form-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <input type="submit" value="Search" className="search-form-button" />
        </form>
      </header>

      <main>
        {isLoading && <p>Loading cute weather for you... ✨</p>}

        {!isLoading && weather && (
          <>
            <div className="weather-app-data">
              <div>
                <h1 className="weather-app-city">{weather.city}</h1>
                <p className="weather-app-details">
                  <span>{formatCityTime(weather.dt, weather.timezone)}</span>,{" "}
                  <span>{weather.description}</span>
                  <br />
                  Humidity: <strong>{weather.humidity}%</strong>, Wind:{" "}
                  <strong>{weather.windSpeed} km/h</strong>
                </p>
              </div>

              <div className="weather-app-temperature-container">
                {/* Big animated emoji icon */}
                <div
                  aria-label={weather.description}
                  style={{
                    fontSize: "72px",
                    marginRight: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: pulse ? "translateY(-4px)" : "translateY(2px)",
                    transition: "transform 0.6s ease-in-out",
                  }}
                >
                  {getWeatherEmoji(
                    weather.iconCode,
                    weather.main,
                    weather.description
                  )}
                </div>

                <div className="weather-app-temperature">
                  {weather.temperature}
                </div>
                <div className="weather-app-unit">°C</div>
              </div>
            </div>

            {/* Forecast */}
            <div className="weather-forecast">
              {forecast.map((day, index) => (
                <div className="weather-forecast-day" key={index}>
                  <div className="weather-forecast-date">
                    {formatForecastDay(day.dt, day.timezone)}
                  </div>
                  <div
                    style={{
                      fontSize: "32px",
                      marginBottom: "6px",
                    }}
                  >
                    {getWeatherEmoji(day.iconCode, day.main, day.description)}
                  </div>
                  <div className="weather-forecast-temperatures">
                    <div className="weather-forecast-temperature">
                      <strong>{day.tempMax}º</strong>
                    </div>
                    <div className="weather-forecast-temperature">
                      {day.tempMin}º
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!isLoading && !weather && <p>Type a city to start ✨</p>}
      </main>

      <footer>
        This project was coded by{" "}
        <a
          href="https://github.com/Chichiprecious1"
          target="_blank"
          rel="noreferrer"
        >
          Tshilidzi Mulibana
        </a>
        , is open-sourced on{" "}
        <a
          href="https://github.com/Chichiprecious1?tab=repositories"
          target="_blank"
          rel="noreferrer"
        >
          Github
        </a>{" "}
        and hosted on{" "}
        <a
          href="https://digitalsolutionhubs.com/"
          target="_blank"
          rel="noreferrer"
        >
          Netlify
        </a>
      </footer>
    </div>
  );
}
