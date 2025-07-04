import { encode, decode } from "html-entities";

import { compileAttrs, formatAttrsForTag, wrapAttrs } from "./compile-attrs";
import {
  Comment,
  CompileOptions,
  ConvertOptions,
  Doctype,
  IndentOptions,
  Node,
  Nodes,
  Script,
  Style,
  Tag,
  Text,
} from "./models";

const getFirstText = (nodes: Nodes[]) => {
  const [textNode] = nodes;
  if (textNode && textNode.node === Node.Text) return textNode;
  return null;
};

const getNodesWithoutText = (nodes: Nodes[]) => {
  const [textNode, ...other] = nodes;
  if (textNode && textNode.node === Node.Text) return other;
  return nodes;
};

const getIndent = ({ level, symbol }: IndentOptions) => symbol.repeat(level);

const wrapPreformattedText = (str: string, options: IndentOptions) =>
  str
    ? ".\n" +
      str
        .trim()
        .split("\n")
        .map((str) => getIndent(options) + str.trimStart())
        .join("\n")
    : "";

const compileDoctype = (_: Doctype, options: CompileOptions) =>
  `${getIndent(options)}doctype html`;

const compileText = (node: Text, options: CompileOptions) => {
  const resultText = node.value
    .split("\n")
    .filter((str, index, arr) => { // 最後的\n砍掉
      if (index +1 === arr.length && !str.trim()) {
        return false;
      }
      return true;
    })
    .filter((str, index, arr) => {
      if (index === 0 && !str.trim() && arr.length > 1) {
        return false;
      }
      return true;
    })
    .map((str) => `${getIndent(options)}| ${options.preserveWhitespace ? str : str.trim()}`)
    .join("\n");
  return options.encode ? encode(resultText) : resultText;
};

const compileSingleLineText = (node: Text, options: CompileOptions) =>
  options.encode ? encode(node.value) : node.value;

const compileComment = (node: Comment, options: CompileOptions) => {
  const start = getIndent(options) + "//";
  const clearedValue = node.value.trim();

  if (!clearedValue.includes("\n")) return start + " " + clearedValue;

  return (
    start +
    "\n" +
    clearedValue
      .split("\n")
      .map(
        (str) =>
          `${getIndent({ ...options, level: options.level + 1 })}${str.trim()}`
      )
      .join("\n")
  );
};

const compileScript = (node: Script, options: CompileOptions) =>
  `${getIndent(options)}script${wrapAttrs(
    compileAttrs(node.attrs, options)
  )}${wrapPreformattedText(node.value, {
    ...options,
    level: options.level + 1,
  })}`;

const compileStyle = (node: Style, options: CompileOptions) =>
  `${getIndent(options)}style${wrapAttrs(
    compileAttrs(node.attrs, options)
  )}${wrapPreformattedText(node.value, {
    ...options,
    level: options.level + 1,
  })}`;

const compileTag = (node: Tag, options: CompileOptions) => {
  const { attrs, className, id } = formatAttrsForTag(node.attrs, options);

  let tag = "";
  if (options.classesAtEnd) {
    tag = [
      getIndent(options),
      node.name,
      id ? `#${id}` : "",
      wrapAttrs(compileAttrs(attrs, options)),
      className ? "." + className.split(" ").join(".") : "",
    ]
      .filter(Boolean)
      .join("");
  } else {
    tag = [
      getIndent(options),
      (id || className) && node.name === "div" ? "" : node.name,
      id ? `#${id}` : "",
      className ? "." + className.split(" ").join(".") : "",
      wrapAttrs(compileAttrs(attrs, options)),
    ]
      .filter(Boolean)
      .join("");
  }

  // 移除文字最後的 \n
  node.children = node.children.filter((child) => {
    if (child.node == 2 && checkLastStrHaveForeSlashN(child.value)) {
      return false;
    }
    return true;
  });
    
  if (options.parser === "vue") {
    node.children = node.children.map((child) => {
      if (child.node == 2) {
        if (options.encode) {
          child.value = encode(child.value);
        } else {
          child.value = decode(child.value, {level: 'html5'});
        }
      }
      return child;
    });
  }
  const textNode = getFirstText(node.children);
  if (!textNode) return tag;
  const resultText = textNode.value.includes("\n")
    ? "\n" + compileText(textNode, { ...options, level: options.level + 1 })
    : " " + compileSingleLineText(textNode, options);
  return `${tag}${resultText}`;
};

/**
 * 檢查字串後面有沒有 \n
 * @example 'abc \n  ', '\r\n', '\n', '\n  ', '\r\n  ' => true
 * @example '\n abc', '\r\n abc','abc' => false 
 * */
const checkLastStrHaveForeSlashN = (str: string) => (/^\r\n[ \t]*$/.test(str) || /^\n[ \t]*$/.test(str));

export function compileAst(ast: Nodes[], options: ConvertOptions): string {
  // 移除 !DOCTYPE後面的 \n
  const findDocTypeElementIndex = ast.findIndex((el) => el.node === 0);
  if (findDocTypeElementIndex !== -1) {
    ast = ast.filter((el, index) => {
      if (index === findDocTypeElementIndex +1 && el.node === 2 && checkLastStrHaveForeSlashN(el.value)){
        return false;
      }
      return true;
    });
  }
  ast = ast.filter((el, index, arr) => {
    // node = 2, 屬於文字類型
    if (el?.node === 2 && checkLastStrHaveForeSlashN(el.value)) {
      // node = 1(html標籤), 移除html </tag> 的 \n
      // node = 5(註解), 移除註解下一行的 \n
      if ([1,5].includes(arr[index - 1]?.node)) {
        return false;
      }
    }
    return true;
  });
  const deepCompile = (ast: Nodes[], level = 0): string[] =>
    ast.reduce<string[]>((acc, node) => {
      const newOptions = { level, ...options };
      let text: string;
      if (node.node === Node.Text) {
        text = compileText(node, newOptions);
        if (options.parser === "vue") {
          if (options.encode) {
            text = encode(text);
          } else {
            text = decode(text, {level: 'html5'});
          }
        }
      }
      switch (node.node) {
        case Node.Doctype:
          return acc.concat(compileDoctype(node, newOptions));
        case Node.Script:
          return acc.concat(compileScript(node, newOptions));
        case Node.Style:
          return acc.concat(compileStyle(node, newOptions));
        case Node.Text:
          return text ? acc.concat(text) : acc;
        case Node.Comment:
          return acc.concat(compileComment(node, newOptions));
        case Node.Tag:
          return acc.concat(
            compileTag(node, newOptions),
            ...deepCompile(getNodesWithoutText(node.children), level + 1)
          );
        default:
          return acc;
      }
    }, []);

  return deepCompile(ast).join("\n") + "\n";
}
