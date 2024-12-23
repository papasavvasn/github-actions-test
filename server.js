const http = require("http");
const fs = require("fs");

let cache = {};

// Load cache from file if it exists
if (fs.existsSync("cache.json")) {
  cache = JSON.parse(fs.readFileSync("cache.json", "utf8"));
}

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
        const data = JSON.parse(body);
        const typeId = data.client_payload.typeId;
        console.log("will store the object and cache", { "data.client_payload": data.client_payload });
        // Store the object in the cache
        cache[typeId] = data;

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

// const contentfulContent = {
//   event_type: "contentful-sync",
//   client_payload: {
//     typeId: "cmsAboutUs",
//     text: [
//       {
//         id: "urlForBreadcrumb",
//         name: "urlForBreadcrumb",
//         type: "Text",
//         localized: false,
//         required: false,
//         validations: [],
//         disabled: false,
//         omitted: false,
//       },
//     ],
//   },
// };
