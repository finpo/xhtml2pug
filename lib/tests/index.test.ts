import fs from "fs";
import path from "path";

import { convert } from "../main";

function generateTests(parser: "html" | "vue") {
  const dir = path.resolve(__dirname, "../../data");

  const inputFiles = fs.readdirSync(dir);

  return inputFiles
    .filter((file) => !file.includes(`.${parser == "html" ? "vue" : "html"}.`))
    .filter((file) => file.endsWith(".html"))
    .map((inputFile) => {
      const htmlPath = path.join(dir, inputFile);
      const html = fs.readFileSync(htmlPath, "utf-8");
      let options;
      try {
        const optionsPath = path.join(dir, inputFile.replace(".html", ".json"));
        options = JSON.parse(fs.readFileSync(optionsPath, "utf-8"));
        // eslint-disable-next-line no-empty
      } catch (e) {}

      return [
        `parser ${parser}: should convert ${inputFile} to match snapshot`,
        html,
        { ...options, parser },
      ];
    });
}

const htmlTests = generateTests("html");
const vueTests = generateTests("vue");

test.each([...htmlTests, ...vueTests])("%s", (_, html, options) => {
  expect(convert(html, options)).toMatchSnapshot();
});
