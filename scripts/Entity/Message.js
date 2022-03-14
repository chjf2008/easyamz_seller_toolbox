/**
 * Object for message handling
 *
 * @param target - Value must be "content", "background" or "popup"
 * @param action - Describe the context and the related action, Example: "Login:Set".
 * @param key - Optional, used for key/ value stores
 * @param value - Optional, contains an object.
 * @constructor
 */

function Message(target, action, key, value) {
    this.target = target;
    this.action = action;
    this.key = key;
    this.value = value;
}

function Message1(target, key, action, value) {
    this.target = target;
    this.key=key;
    this.action = action;
    this.value = value;
}