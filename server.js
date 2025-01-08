const http = require("http");
const fs = require("fs");
const axios = require("axios");

let cache = {};

// Load cache from file if it exists
if (fs.existsSync("cache.json")) {
  cache = JSON.parse(fs.readFileSync("cache.json", "utf8"));
  if (!cache.counter) {
    cache.counter = 0;
  }
} else {
  cache.counter = 0;
}

const triggerE2ETests = async () => {
  const githubToken = process.env.test_token_for_contentful_post_webhook;

  const payload = {
    event_type: "trigger-e2e-tests",
  };

  try {
    await axios.post(`https://api.github.com/repos/papasavvasn/github-actions-test/dispatches`, payload, {
      headers: {
        Authorization: `token ${githubToken}`,
        "Content-Type": "application/json",
      },
    });
    console.log(`Triggered E2E tests`);
  } catch (error) {
    console.error("Error triggering E2E tests:", error);
  }
};

const requestListener = function (req, res) {
  console.log(`Received request: ${req.method} ${req.url}`);
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      console.log("Headers:", req.headers);
      console.log("Body:", body);
      try {
        console.log("Will Parse the body");
        const data = JSON.parse(body);
        console.log("data after parsing the body", data);
        const typeId = data.typeId;

        // Compare incoming fields with cached fields and log changes
        if (cache[typeId]) {
          data.fields.forEach((field) => {
            const cachedField = cache[typeId].find((f) => f.id === field.id);
            if (cachedField) {
              if (cachedField.omitted === false && field.omitted === true) {
                console.log(`Field ${field.id} omitted changed from ${cachedField.omitted} to ${field.omitted}`);
                triggerE2ETests();
              }
            }
          });
          // Check for removed fields
          cache[typeId].forEach((cachedField) => {
            const incomingField = data.fields.find((f) => f.id === cachedField.id);
            if (!incomingField) {
              console.log(
                `Field ${cachedField.id} has been removed from Content Type ${typeId}. This is a potential breaking change.`
              );
              triggerE2ETests();
            }
          });
        }

        // Store the object in the cache
        cache[typeId] = data.fields.map((field) => ({
          id: field.id,
          required: field.required,
          omitted: field.omitted,
          disabled: field.disabled,
        }));

        // Increment the counter
        cache.counter += 1;

        console.log("counter", cache.counter);
        console.log("cache after storing the object in the cache", cache);
        // Save the cache to a file
        fs.writeFileSync("cache.json", JSON.stringify(cache, null, 2));

        res.writeHead(200);
        res.end("Request logged and processed");
      } catch (error) {
        console.error("Error processing request:", error);
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });
  } else {
    res.writeHead(405);
    res.end("Method Not Allowed");
  }
};

const server = http.createServer(requestListener);
server.listen(8000, () => {
  console.log("Server is running on http://0.0.0.0:8000");
});
