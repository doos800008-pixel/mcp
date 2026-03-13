/**
 * تعريفات أدوات المتصفح بصيغة OpenAI function calling
 * Browser tool definitions in OpenAI function calling format
 */
import type OpenAI from "openai";

/** جميع أدوات المتصفح المتاحة للوكيل / All browser tools available to the agent */
export const browserToolDefinitions: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "browser_navigate",
      description:
        "Navigate the browser to a specific URL. Use this to open web pages.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL to navigate to (e.g., https://example.com)",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_click",
      description:
        "Click on an element on the current page. Use the element's accessible name or description to identify it.",
      parameters: {
        type: "object",
        properties: {
          element: {
            type: "string",
            description:
              "Human-readable description of the element to click (e.g., 'Search button', 'Login link')",
          },
          ref: {
            type: "string",
            description:
              "Optional element reference ID from the page snapshot for precise targeting",
          },
        },
        required: ["element"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_type",
      description:
        "Type text into an input field or editable element on the current page.",
      parameters: {
        type: "object",
        properties: {
          element: {
            type: "string",
            description:
              "Human-readable description of the input field (e.g., 'Search box', 'Email field')",
          },
          text: {
            type: "string",
            description: "The text to type into the element",
          },
          submit: {
            type: "boolean",
            description:
              "Whether to press Enter after typing to submit the form (default: false)",
          },
          ref: {
            type: "string",
            description: "Optional element reference ID from the page snapshot",
          },
        },
        required: ["element", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_snapshot",
      description:
        "Take an accessibility snapshot of the current page. Returns the page structure with all interactive elements. Use this to understand the page content before interacting with it.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_screenshot",
      description:
        "Take a screenshot of the current browser page. Returns a base64-encoded PNG image.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_hover",
      description:
        "Hover the mouse over an element on the current page. Useful for revealing dropdown menus or tooltips.",
      parameters: {
        type: "object",
        properties: {
          element: {
            type: "string",
            description: "Human-readable description of the element to hover over",
          },
          ref: {
            type: "string",
            description: "Optional element reference ID from the page snapshot",
          },
        },
        required: ["element"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_select_option",
      description:
        "Select one or more options from a dropdown/select element on the current page.",
      parameters: {
        type: "object",
        properties: {
          element: {
            type: "string",
            description: "Human-readable description of the select element",
          },
          values: {
            type: "array",
            items: { type: "string" },
            description: "Array of option values or labels to select",
          },
          ref: {
            type: "string",
            description: "Optional element reference ID from the page snapshot",
          },
        },
        required: ["element", "values"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_press_key",
      description:
        "Simulate pressing a keyboard key. Useful for navigation (Tab, Enter, Escape, Arrow keys).",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description:
              "The key to press (e.g., 'Enter', 'Tab', 'Escape', 'ArrowDown', 'F5')",
          },
        },
        required: ["key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_wait",
      description:
        "Wait for a specified number of seconds. Use when waiting for page animations or loading.",
      parameters: {
        type: "object",
        properties: {
          time: {
            type: "number",
            description: "Number of seconds to wait (e.g., 1, 2, 3)",
          },
        },
        required: ["time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_go_back",
      description:
        "Navigate the browser back to the previous page in browser history.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_go_forward",
      description:
        "Navigate the browser forward to the next page in browser history.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_drag",
      description:
        "Drag an element from one location to another on the current page.",
      parameters: {
        type: "object",
        properties: {
          startElement: {
            type: "string",
            description:
              "Human-readable description of the element to drag from (e.g., 'Draggable item')",
          },
          startRef: {
            type: "string",
            description:
              "Optional element reference ID from the page snapshot for the source element",
          },
          endElement: {
            type: "string",
            description:
              "Human-readable description of the target drop location (e.g., 'Drop zone')",
          },
          endRef: {
            type: "string",
            description:
              "Optional element reference ID from the page snapshot for the target element",
          },
        },
        required: ["startElement", "endElement"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_get_console_logs",
      description:
        "Get the browser console logs from the current page. Useful for debugging JavaScript errors.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];
