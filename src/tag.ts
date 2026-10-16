
import { Uuid } from "./uuid";

export type Node = Element | string | number;

export class Element {
	public name: string;
	public attributes: Record<string, string>;
	public children: Node[];
	constructor(name: string) {
		this.name = name;
		this.attributes = {};
		this.children = [];
		return this;
	}
	// Single attribute
	attr(key: string, value: string): Element {
		if (this.attributes[key]) {
			this.attributes[key] = this.attributes[key] + " " + value;
		}
		else {
			this.attributes[key] = value;
		}
		return this;
	}
	// Many attributes
	attrs(entries: Record<string, string>): Element {
		for (const [key, value] of Object.entries(entries)) {
			this.attr(key, value);
		}
		return this;
	}
	// Push child
	appendChild(child: Node): Element {
		this.children.push(child);
		return this;
	}
	// Push children
	appendChildren(...children: Node[]): Element {
		this.children.push(...children);
		return this;
	}
	// Query for a certain tag
	queryAll(name: string): Element[] {
		const found: Element[] = [];
		for (const child of this.children) {
			// Only search elements
			if (child instanceof Element) {
				// If child has tag name then add to found list
				if (child.name === name) found.push(child);
				// Search all of its children too
				const found_inner = child.queryAll(name);
				if (found_inner != null) found.push(...found_inner);
			}
		}
		return found;
	}
	// Get as string
	toString(): string {
    const attributes = Object.entries(this.attributes)
      .map(([key, value]) => ` ${key}="${value}"`)
      .join("");
    const children = this.children.map(String).join("");
    return `<${this.name}${attributes}>${children}</${this.name}>`;
  }
}

export function tag(name: string, ...children: Node[]): Element {
	let result = new Element(name);
	result.appendChildren(...children);
	return result;
}


/**
 * Skeleton CSS div with a row class
 *
 * @param children Array of HTML Nodes
 * @returns Image HTML Element
 */
export function row(...children: Node[]): Element {
	return tag("div", ...children).attr("class", "row");
}

/**
 * Archor HTML Element with an href URL
 *
 * @param href URL
 * @param children Array of HTML Nodes
 * @returns Image HTML Element
 */
export function a(href: string, ...children: Node[]): Element {
	return tag("a", ...children).attr("href", href);
}

/**
 * Image HTML Element with a src URL
 *
 * @param href URL
 * @param children Array of HTML Nodes
 * @returns Image HTML Element
 */
export function img(href: string, ...children: Node[]): Element {
	return tag("img", ...children).attr("src", href);
}

/**
 * FormOptions:
 * - href: HTTP URL
 * - method: HTTP Method
 * - submit_text: The initial submit button text (Default: "Submit")
 * - message_text: The initial message paragraph text (Default: Empty string)
 */
export type FormOptions = {
	href: string,
	method: string,
	submit_text?: string,
	message_text?: string,
}

/**
 * Create Form element with:
 * 1. Message paragraph
 * 2. Input fields
 * 3. Submit button
 * 4. Automatic submit using JSON
 *
 * FormOptions:
 * - href: HTTP URL
 * - method: HTTP Method
 * - submit_text: The initial submit button text
 * - message_text: The initial message paragraph text (This element is updated on submit)
 *
 * @param options FormOptions
 * @param children Child Nodes
 * @returns Form Element
 */
export function form(options: FormOptions, ...children: Node[]): Element {
	// stuff
	const submit_id = Uuid.randomv4();
	const message_id = Uuid.randomv4();
	const ids: string[] = [];
	const result = tag("form",
		tag("p", options.message_text || "").attrs({ "id": message_id.toString() }),
		...children
	);

	// Get all inputs or textbox
	result.queryAll("input")
		.concat(result.queryAll("textarea"))
		?.forEach((a) => {
			const id = Uuid.randomv4();
			a.attr("id", id.toString());
			ids.push(id.toString());
		});

	// Add submit and script for submitting
	result.appendChildren(
		tag("input").attrs({ "type": "submit", "id": submit_id.toString(), "value": options.submit_text || "Submit" }),
		tag("script").attrs({
			"src": "/js/form.js",
			"data-href": options.href,
			"data-method": options.method,
			"data-submit_id": submit_id.toString(),
			"data-message_id": message_id.toString(),
			"data-input_ids": JSON.stringify(ids).replaceAll("\"", "\'"),
		})
	);
	return result;
}

/**
 * Input HTML Element with a type attribute
 * (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input#input_types)
 *
 * @param type Input HTML Element Type
 * @param children Array of HTML Nodes
 * @returns Input HTML Element
 */
export function input(type: string, ...children: Node[]): Element {
	return tag("input", ...children).attr("type", type);
};

/**
 * Builds a HTML table using an Array of items. The callback function is called on each item
 *
 * @param table Array of items the table is built on
 * @param callback Each item's row in the table
 * @returns Table HTML Element
 */
export function table<T>(table: T[], callback: (value: T) => Element): Element {
	return tag("table",
		...table.map((a) => callback(a)),
	);
}
