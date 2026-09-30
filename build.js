const fs = require("fs");
const path = require("path");

const root = __dirname;
const bodyTags = ["header", "newsletter", "footer"];

function loadPartials() {
  const partials = {};
  for (const tag of bodyTags) {
    const file = path.join(root, "partials", tag + ".html");
    if (fs.existsSync(file)) {
      partials[tag] = fs.readFileSync(file, "utf8").trim();
    }
  }
  return partials;
}

function buildPages(partials) {
  const files = fs.readdirSync(root).filter((f) => f.endsWith(".html") && !f.startsWith("build."));
  const markerRe = /<!--INCLUDE:(\w+)-->([\s\S]*?)<!--\/INCLUDE:\1-->/g;

  for (const file of files) {
    const filePath = path.join(root, file);
    let html = fs.readFileSync(filePath, "utf8");
    let replaced = false;

    html = html.replace(markerRe, (match, tag, inner) => {
      if (!(tag in partials)) {
        console.warn("[" + file + "] missing partial: " + tag);
        return match;
      }
      replaced = true;
      return "<!--INCLUDE:" + tag + "-->\n" + partials[tag] + "\n<!--/INCLUDE:" + tag + "-->";
    });

    if (replaced) {
      fs.writeFileSync(filePath, html);
      console.log("built " + file);
    }
  }
}

buildPages(loadPartials());