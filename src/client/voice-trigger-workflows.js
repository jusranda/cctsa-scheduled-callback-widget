/**
 * Copyright 2022 David Finnegan, Justin Randall, Cisco Systems Inc. All Rights Reserved.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { LitElement, html } from "lit";
import style from './style.scss';

/**
 * Implementation for WxCC Voice Trigger Workflow widget for the WxCC Agent Desktop
 * 
 * @author David Finnegan
 */
export class VoiceTriggerWorkflows extends LitElement {

  /**
   * Access handler for style assets.
   * 
   * @returns the style contents of style.scss.
   */
  static get styles() {
    return [style]
  }

  /**
   * The widget properties.
   * 
   * @static
   * @type {Object}
   */
  static properties = {
    darkmode: {},
    configJSON: {},
    taskMap: {},
    taskSelected: {},
    _mainIsOpen: {state: true},
    _menuIsOpen: {state: true},
    _showBtn: {state: true},
    _config: {state: true},
    _selected: {sate: true}
  }

  /**
   * Construct a new instance.
   */
  constructor() {
    super();
    this.darkmode = null;
    this.configJSON = null;
    this.taskMap = null;
    this.taskSelected = null;
    this._theme = "";
    this._mainIsOpen = false;
    this._menuIsOpen = false;
    this._showBtn = false;
    this._config = null;
    this._selected = null;

    const today = new Date();
    const maxDays = 30;
    today.setDate(today.getDate() + maxDays);

    /**
     * The error handler message.
     * 
     * @private
     * @type {string}
     */
    this._maxCallbackDays = today.toISOString();

    /**
     * The error handler message.
     * 
     * @private
     * @type {string}
     */
    this._errorMessage = '';

    /**
     * The error message style.
     * 
     * @private
     * @type {string}
     */
    this._errorStyle = 'color:red';
  }

  

  /**
   * Invoked when the component is added to the document's DOM.
   */
  connectedCallback() {
    super.connectedCallback()
    this._theme = this.setTheme();

    // Convert JSON proxy obj back into a JS Object
    this._config = JSON.parse(JSON.stringify(this.configJSON));
  }

  /**
   * Invoked when the component is removed from the document's DOM.
   */
  disconnectedCallback() {
    // TODO: What do I need to do there?
  }

  /**
   * Updates the element. This method reflects property values to attributes
   * and calls `render` to render DOM via lit-html. Setting properties inside
   * this method will *not* trigger another update.
   * 
   * @param changedProperties Map of changed properties with old values
   * @category updates
   */
  updated(changedProperties) {
    if (changedProperties.has('darkmode')) { this._theme = this.setTheme() }

    if (changedProperties.has('taskSelected')) {
      if (this.taskSelected == null) {
        this._showBtn = false;
      } else if (this.taskSelected.mediaType == "telephony") {
        this._showBtn = true;
      } else {
        this._showBtn = false;
      }
    }
  }

  /**
   * Sets the UI darkmode theme for the widget.
   * 
   * @returns "dark" if darkmode is enabled; otherwise, "light".
   */
  setTheme() {
    return this.darkmode == 'true' ? "dark" : "light";
  }

  /**
   * Click handler for div id="btn"
   */
  btnClicked() {
    if (this._mainIsOpen == false) {
      this._mainIsOpen = true;
      this._menuIsOpen = true;
    } else {
      this._mainIsOpen = false;
      this._menuIsOpen = false;
      if (this._selected) {
        this.cancelClicked();
      } 
    }
   }

  /**
   * Click handler for div id="menu"
   * 
   * @param event The click event.
   */
  menuClicked(event) {
    this._selected = event.target.getAttribute('data-id');
    this.shadowRoot.querySelector(`[data-modal-id="${this._selected}"]`).setAttribute("opened", "");
    this.shadowRoot.querySelector("#menu").removeAttribute("opened");
  }

  /**
   * Cancel widget click handler.
   */
  cancelClicked() {
    const id = this._selected;
    this.shadowRoot.querySelector(`[data-modal-id="${id}"]`).removeAttribute("opened");
    
    this._mainIsOpen = false;
    this._menuIsOpen = false;

    if (this._config[id].parameters){
      this._config[id].parameters.forEach(param => this.shadowRoot.querySelector(`[data-id-input="${id}"][name="${param.name}"]`).value = "");
    }

    this._selected = null;
  }

  /**
   * Submit widget click handler.
   * 
   * @param event The click event.
   */
  submitClicked(event){
    /**
     * Invoke an HTTP fetch with a timeout.
     * 
     * @param {*} resource The URL.
     * @param {*} options the HTTP operation control parameters.
     * @returns the HTTP response.
     */
    async function fetchWithTimeout(resource, options = {}) {
      const { timeout = 6000 } = options;  
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(resource, {...options, signal: controller.signal});
      clearTimeout(id);
      return response;
    }

    /**
     * Submit the form data to the HTTP handler.
     * 
     * @param {string} url  The HTTP URL.
     * @param {Object} body The HTTP request body.
     */
    async function submitForm(url, body) {
      try {
        const response = await fetchWithTimeout(url, {
          timeout: 6000,
          method: 'POST',
          body: JSON.stringify(body),
          headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        console.log('voice-trigger-workflow Post Result', response.status, data);

        // TODO: Refine error handling here.
        switch (data.retval) {
          case 0:
            alert('Success');
            break;
          case -1:
          case 1:
          case 2:
            alert(`Error ${data.retval}: ${data.retmsg}`);
            break;
          default:
            alert(`Unhandled Error Code ${data.retval}: ${data.retmsg}`);
            break;
        }
      } catch (error) {
        console.log('voice-trigger-workflow Post Error', error);
      }
    }

    const id = event.target.getAttribute('data-id');

    let body = {};
    if (this._config[id].parameters){
      this._config[id].parameters.forEach(param => {
        body[param.name] = this.shadowRoot.querySelector(`[data-id-input="${id}"][name="${param.name}"]`).value;
        });
    }

    let key = this.taskSelected.interactionId;
    let task = JSON.parse(JSON.stringify(this.taskMap.get(key)));

    body = {...body, ...task};

    submitForm(this._config[id].url, body);
    this.cancelClicked();
  }

  /**
   * Dynamically set the input type based on the parameters.type value in the Agent Desktop layout.
   * 
   * @param {Object} action The action objcet containing the input parameters.
   * @param {number} index  The action input parameter index.
   * @returns the dyncamically typed HTML input markup.
   */
  modalSectionTemplate(action, index){
    if (action.parameters) {
      return html`
        ${action.parameters.map(param => {
          if (param.type === 'input') {
            return html`
              <label>${param.label}</label>
              <input data-id-input="${index}" name="${param.name}" type="text">`
          }
          if (param.type === 'select') {
            return html`
              <label>${param.label}</label>
              <select data-id-input="${index}" name="${param.name}">
                ${param.values.map(value =>  html`<option>${value}</option>` )}
              </select>
             `
          }
          if (param.type === 'datetime') {
            return html`
              <label>${param.label}</label>
              <input type="datetime-local" data-id-input="${index}" name="${param.name}" max="${this._maxCallbackDays}">
            `
          }
        })}
      `
    }
  }

  /**
   * Invoked on each update to perform rendering tasks. This method may return
   * any value renderable by lit-html's `ChildPart` - typically a
   * `TemplateResult`. Setting properties inside this method will *not* trigger
   * the element to update.
   * 
   * @category rendering
   */
  render() {
    return html`
      ${this._showBtn
          ? html`
          <div id="voice-trigger-workflow" .className=${this._theme}>
            <span id="error" style="${this._errorStyle}" >${this._errorMessage}</span>
            <div id="btn" @click=${this.btnClicked}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09zM4.157 8.5H7a.5.5 0 0 1 .478.647L6.11 13.59l5.732-6.09H9a.5.5 0 0 1-.478-.647L9.89 2.41 4.157 8.5z"/></svg></div>
            <div id="main" ?opened=${this._mainIsOpen}>
              <div id="menu" ?opened=${this._menuIsOpen}>
                ${this._config.map((action, index) =>
                  html`<p data-id="${index}" @click=${this.menuClicked}>${action.name}</p>`
                )}
              </div>
    
              ${this._config.map((action, index) =>
                html`
                  <div data-modal-id="${index}" class="modal">
                    <header>
                      <p>Trigger ${action.name}?</p>
                    </header>

                    <section>
                      ${this.modalSectionTemplate(action, index)}
                    </section>
                    
                    <footer>
                      <button data-id="${index}" @click=${this.cancelClicked} class="cancel-btn">Cancel</button>
                      <button data-id="${index}" @click=${this.submitClicked} class="trigger-btn">Schedule</button>
                    </footer>
                  </div>
                `)}
            </div>
          </div>
      `
      : html``
    }`;
  }
}

customElements.define('voice-trigger-workflows', VoiceTriggerWorkflows);
