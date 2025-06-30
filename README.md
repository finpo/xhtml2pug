# xhtml2pug

it's fork from dimensi/xhtml2pug

由於自 2022 年後原專案已經無人維護
並且有一些 Bug 問題導致使用上困難
因此 fork 修改相關問題

Since the original project has not been maintained since 2022
and there are some bug issues that make it difficult to use
therefore fork to fix related issues

Converts **HTML** and **Vue** like syntax to **Pug** templating language.  
Requires Node.js version `14` or higher.



Turns this

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Hello World!</title>
  </head>
  <body>
    <div id="content">
      <h1 class="title">Hello World!</h1>
    </div>
  </body>
</html>
```

Into this

```pug
doctype html
html(lang='en')
  head
    title Hello World!
   body
    #content
      h1.title Hello World!
```

## Install

Get it on [npm](https://www.npmjs.com/package/xhtml2pug):

```bash
npm install -g xhtml2pug
```

## Usage

### CLI

Accept input from a file or stdin and write to stdout:

```bash
# choose a file
xhtml2pug < example.html

# use pipe
echo '<h1>foo</h1>' | xhtml2pug -f
```

Write output to a file:

```bash
xhtml2pug < example.html > example.pug
```

See `xhtml2pug --help` for more information.

### Programmatically

```js
import { convert } from "xhtml2pug";

const html = '<header><h1 class="title">Hello World!</h1></header>';
const pug = convert(html, { symbol: '\t' });
```

### Cli Options

```bash
  -b, --bodyLess      Don't wrap into html > body
                                           [boolean] [default: false]
  -t, --tabs          Use tabs as indent              [boolean] [default: false]
  -s, --spaces        Number of spaces for indent          [number] [default: 2]
  -a, --attrComma     Commas in attributes [boolean] [default: false]
  -e, --encode        Encode html characters           [boolean] [default: true]
  -q, --doubleQuotes  Use double quotes for attributes[boolean] [default: false]
  -i, --inlineCSS     Place all classes in class attribute
                                                      [boolean] [default: false]
  -c, --classesAtEnd  Place all classes after attributes
                                                      [boolean] [default: false]
  -p, --parser        html for any standard html, vue for any vue-like html
                             [string] [choices: "html", "vue"] [default: "html"]
  -w, --preserveWhitespace  Preserve whitespaces and indentation in text nodes
                            [boolean] [default: false]
```

### Api Options

```ts
export interface PublicOptions {
  /** Don't wrap into html > body */
  bodyLess: boolean;
  /** Commas in attributes */
  attrComma: boolean;
  /**  Encode html characters */
  encode: boolean;
  /** Use double quotes for attributes */
  doubleQuotes: boolean;
  /** Place all classes in class attribute */
  inlineCSS: boolean;
  /** Symbol for indents, can be anything */
  symbol: string;
  /** Html for any standard html, vue for any vue-like html */
  parser: "html" | "vue";
  /** Place all classes after attributes */
  classesAtEnd: boolean;
  /** Preserve whitespaces and indentation in text nodes */
  preserveWhitespace: boolean;
}
```
