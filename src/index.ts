// Import necessary dependencies from React, JupyterLab, and other modules
import * as React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { INotebookTracker, NotebookPanel, NotebookActions } from '@jupyterlab/notebook';
import { ICellFooter, Cell } from '@jupyterlab/cells';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { CommandRegistry } from '@lumino/commands';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import '../style/index.css';

// Define CSS classes used in the cell footer.
const CSS_CLASSES = {
  CELL_FOOTER: 'jp-CellFooter',
  CELL_FOOTER_DIV: 'ccb-cellFooterContainer',
  CELL_FOOTER_BUTTON: 'ccb-cellFooterBtn',
  CELL_TOGGLE_BUTTON: 'ccb-toggleBtn',
  CUSTOM_OUTPUT_AREA: 'custom-output-area', 
};

// Define command constants
const COMMANDS = {
  HIDE_CELL_CODE: 'hide-cell-code',
  SHOW_CELL_CODE: 'show-cell-code',
  RUN_SELECTED_CODECELL: 'run-selected-codecell',
  CLEAR_SELECTED_OUTPUT: 'clear-output-cell',
};

// Function to activate custom commands
function activateCommands(app: JupyterFrontEnd, tracker: INotebookTracker): Promise<void> {
  // Output a message to the console to indicate activation
  console.log('JupyterLab extension jupyterlab-aaVisualPolish is activated!');

  // Wait for the app to be restored before proceeding
  Promise.all([app.restored]).then(([params]) => {
    const { commands, shell } = app;

    // Function to get the current NotebookPanel
    function getCurrent(args: ReadonlyPartialJSONObject): NotebookPanel | null {
      const widget = tracker.currentWidget;
      const activate = args.activate !== false;

      if (activate && widget) {
        shell.activateById(widget.id);
      }

      return widget;
    }

    /**
    * Function to check if the command should be enabled.
    * It checks if there is a current notebook widget and if it matches the app's current widget.
    * If both conditions are met, the command is considered enabled.
    */
    function isEnabled(): boolean {
      return (
        tracker.currentWidget !== null &&
        tracker.currentWidget === app.shell.currentWidget
      );
    }

    // Define a command to hide the code in the current cell
    commands.addCommand(COMMANDS.HIDE_CELL_CODE, {
      label:'Hide Cell',
      execute: args => {
        const current = getCurrent(args);
        if (current) {
          const { content } = current;
          NotebookActions.hideCode(content);
        }
      },
      isEnabled
    });

    // Define a command to show the code in the current cell
    commands.addCommand(COMMANDS.SHOW_CELL_CODE , {
      label: 'Show Cell',
      execute: args => {
        const current = getCurrent(args);
        if (current) {
          const { content } = current;
          NotebookActions.showCode(content);
        }
      },
      isEnabled
    });

    // Define a command to run the code in the current cell
    commands.addCommand(COMMANDS.RUN_SELECTED_CODECELL, {
      label: 'Run Cell',
      execute: args => {
        const current = getCurrent(args);
        if (current) {
          const { context, content } = current;
          NotebookActions.run(content, context.sessionContext);          
        }
      },
      isEnabled
    });

    commands.addCommand(COMMANDS.CLEAR_SELECTED_OUTPUT, {
      label: 'Clear Output',
      execute: args => {
        const current = getCurrent(args);
        if (current) {
          const { content } = current;
          NotebookActions.clearOutputs(content);
        }
      },
      isEnabled
    });
  });

  //Event listener to collapse code cells when a notebook is loaded
  tracker.widgetAdded.connect((sender, panel) => {
    function collapseAllCodeCells(panel: NotebookPanel) {
      const { content } = panel;
      const cells = content.widgets;
      cells.forEach(cell => {
        if (cell.model.type === 'code') {
          NotebookActions.hideAllCode(panel.content);
        }
      });
    }  
    // Collapse code cells when the current notebook is loaded
    panel.context.ready.then(() => {
      collapseAllCodeCells(panel);    
    });
  });
  
  return Promise.resolve();
}

/**
 * Extend the default implementation of an `IContentFactory`.
 */
export class ContentFactoryWithFooterButton extends NotebookPanel.ContentFactory {
  constructor(commands: CommandRegistry, options: Cell.ContentFactory.IOptions) {
    super(options);
    this.commands = commands;
  }
  /**
   * Create a new cell header for the parent widget.
   */
  createCellFooter(): ICellFooter {
    return new CellFooterWithButton(this.commands);
  }

  private readonly commands: CommandRegistry;
}

/**
 * Extend the default implementation of a cell footer with custom buttons.
 */
export class CellFooterWithButton extends ReactWidget implements ICellFooter {
  private readonly commands: CommandRegistry;
  private codeVisible: boolean;
  private RUN_ICON = 'fas fa-play-circle';
  private CLEAR_ICON = 'fas fa-broom';
  private HIDE_ICON = 'fas fa-eye-slash';
  private SHOW_ICON = 'fas fa-eye';

  constructor(commands: CommandRegistry) {
    super();
    this.addClass(CSS_CLASSES.CELL_FOOTER);
    this.commands = commands;
    this.codeVisible = false;

    // Add an event listener to the blue bar element
    this.node.addEventListener('click', (event) => {
    // Prevent the default behavior (collapsing/expanding)
      event.preventDefault();
    });
  }

  render() {
    console.log('Rendering element');

    const toggleIcon = this.codeVisible ? this.HIDE_ICON : this.SHOW_ICON;
        
    return React.createElement("div", {className: CSS_CLASSES.CELL_FOOTER_DIV }, 
      React.createElement("button",{
          className: CSS_CLASSES.CELL_FOOTER_BUTTON,
          onClick: () => {
            console.log("Clicked run cell");
            this.commands.execute(COMMANDS.RUN_SELECTED_CODECELL);
          },
        },
        React.createElement("i", { className: this.RUN_ICON })
        ),
        React.createElement("button", {
          className: `${CSS_CLASSES.CELL_FOOTER_BUTTON} ${CSS_CLASSES.CELL_TOGGLE_BUTTON}`,
          onClick: () => {
            console.log("Clicked toggle cell visibility");
            this.codeVisible = !this.codeVisible;
            if (this.codeVisible) {
              this.commands.execute(COMMANDS.SHOW_CELL_CODE);
            } else {
              this.commands.execute(COMMANDS.HIDE_CELL_CODE);
            }
            this.update();
          },
        },
        React.createElement("i", { className: toggleIcon })
        ),
        React.createElement("button", {
          className: CSS_CLASSES.CELL_FOOTER_BUTTON,
          onClick: () => {
            console.log("Clicked clear output");
            this.commands.execute(COMMANDS.CLEAR_SELECTED_OUTPUT);
          },
        },
        React.createElement("i", { className: this.CLEAR_ICON })
        )
    );
  }
}

// Define a custom output area
export class CustomOutputArea extends OutputArea {
  constructor(commands: CommandRegistry) {
    // Create a RenderMimeRegistry instance
    const rendermime = new RenderMimeRegistry();

    super({
      rendermime, // Use the RenderMimeRegistry instance
      contentFactory: OutputArea.defaultContentFactory,
      model: new OutputAreaModel({ trusted: true }),
    });
    this.addClass(CSS_CLASSES.CUSTOM_OUTPUT_AREA);
  }
}

/**
 * Define a JupyterLab extension to add footer buttons to code cells.
 */
const footerButtonExtension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-aaVisualPolish',
  autoStart: true,
  activate: activateCommands,
  requires: [INotebookTracker]
};

/**
 * Define a JupyterLab extension to override the default notebook cell factory.
 */
const cellFactory: JupyterFrontEndPlugin<NotebookPanel.IContentFactory> = {
  id: 'jupyterlab-aaVisualPolish:factory',
  provides: NotebookPanel.IContentFactory,
  requires: [IEditorServices],
  autoStart: true,
  activate: (app: JupyterFrontEnd, editorServices: IEditorServices) => {
    // tslint:disable-next-line:no-console
    console.log(
      'JupyterLab extension jupyterlab-aaVisualPolish',
      'overrides default nootbook content factory'
    );

    const { commands } = app;
    const editorFactory = editorServices.factoryService.newInlineEditor;
    return new ContentFactoryWithFooterButton(commands, { editorFactory });
  }
};

/**
 * Export this plugins as default.
 */
const plugins: Array<JupyterFrontEndPlugin<any>> = [
  footerButtonExtension,
  cellFactory
];

export default plugins;