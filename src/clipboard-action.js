import select from 'select';

/**
 * Inner class which performs selection from either `text` or `target`
 * properties and then executes copy or cut operations.
 */
export default class ClipboardAction {
    /**
     * @param {Object} options
     */
    constructor(options) {
        this.resolveOptions(options);
        this.initSelection();
    }

    /**
     * Defines base properties passed from constructor.
     * @param {Object} options
     */
    resolveOptions(options = {}) {
        // XXX: use traditional setters internally
        this.setAction(options.action);
        this.emitter = options.emitter;
        this.setTarget(options.target);
        this.text    = options.text;
        this.trigger = options.trigger;

        this.selectedText = '';
    }

    /**
     * Decides which selection strategy is going to be applied based
     * on the existence of `text` and `target` properties.
     */
    initSelection() {
        if (this.text && this.getTarget()) {
            throw new Error('Multiple attributes declared, use either "target" or "text"');
        }
        else if (this.text) {
            this.selectFake();
        }
        else if (this.getTarget()) {
            this.selectTarget();
        }
        else {
            throw new Error('Missing required attributes, use either "target" or "text"');
        }
    }

    /**
     * Creates a fake textarea element, sets its value from `text` property,
     * and makes a selection on it.
     */
    selectFake() {
        this.removeFake();

        this.fakeHandler = document.body.addEventListener('click', () => this.removeFake());

        this.fakeElem = document.createElement('textarea');
        this.fakeElem.style.position = 'absolute';
        this.fakeElem.style.left = '-9999px';
        this.fakeElem.style.top = (window.pageYOffset || document.documentElement.scrollTop) + 'px';
        this.fakeElem.setAttribute('readonly', '');
        this.fakeElem.value = this.text;

        document.body.appendChild(this.fakeElem);

        this.selectedText = select(this.fakeElem);
        this.copyText();
    }

    /**
     * Only removes the fake element after another click event, that way
     * a user can hit `Ctrl+C` to copy because selection still exists.
     */
    removeFake() {
        if (this.fakeHandler) {
            document.body.removeEventListener('click');
            this.fakeHandler = null;
        }

        if (this.fakeElem) {
            document.body.removeChild(this.fakeElem);
            this.fakeElem = null;
        }
    }

    /**
     * Selects the content from element passed on `target` property.
     */
    selectTarget() {
        this.selectedText = select(this.getTarget());
        this.copyText();
    }

    /**
     * Executes the copy operation based on the current selection.
     */
    copyText() {
        let succeeded;

        try {
            succeeded = document.execCommand(this.getAction());
        }
        catch (err) {
            succeeded = false;
        }

        this.handleResult(succeeded);
    }

    /**
     * Fires an event based on the copy operation result.
     * @param {Boolean} succeeded
     */
    handleResult(succeeded) {
        if (succeeded) {
            this.emitter.emit('success', {
                action: this.getAction(),
                text: this.selectedText,
                trigger: this.trigger,
                clearSelection: this.clearSelection.bind(this)
            });
        }
        else {
            this.emitter.emit('error', {
                action: this.getAction(),
                trigger: this.trigger,
                clearSelection: this.clearSelection.bind(this)
            });
        }
    }

    /**
     * Removes current selection and focus from `target` element.
     */
    clearSelection() {
        if (this.getTarget()) {
            this.getTarget().blur();
        }

        window.getSelection().removeAllRanges();
    }

    /**
     * Sets the `action` to be performed which can be either 'copy' or 'cut'.
     * @param {String} action
     */
    setAction(action = 'copy') {
        this._action = action;

        if (this._action !== 'copy' && this._action !== 'cut') {
            throw new Error('Invalid "action" value, use either "copy" or "cut"');
        }
    }

    /**
     * Gets the `action` property.
     * @return {String}
     */
    getAction() {
        return this._action;
    }

    /**
     * Sets the `target` property using an element
     * that will be have its content copied.
     * @param {Element} target
     */
    setTarget(target) {
        if (target !== undefined) {
            if (target && typeof target === 'object' && target.nodeType === 1) {
                this._target = target;
            }
            else {
                throw new Error('Invalid "target" value, use a valid Element');
            }
        }
    }

    /**
     * Gets the `target` property.
     * @return {String|HTMLElement}
     */
    getTarget() {
        return this._target;
    }

    /**
     * Destroy lifecycle.
     */
    destroy() {
        this.removeFake();
    }
}
