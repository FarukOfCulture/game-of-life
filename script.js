'use strict';

let canvas = document.querySelector('canvas')
let ctx = canvas.getContext("2d")

function make_environment(env) {
	return new Proxy(env, {
		get(target, prop, receiver) {
			if (env[prop] !== undefined) {
				return env[prop].bind(env);
			}
			return (...args) => {
				throw new Error(`NOT IMPLEMENTED: ${prop} ${args}`);
			}
		}
	});
}
let w = undefined;
let previous = undefined;
let left_clicked = false;
let right_clicked = false;
let pressed_keys = [];
let mouseX = undefined
let mouseY = undefined
let buffer = undefined;

const getColor = (ptr) => {
	let arr = new Uint8ClampedArray(buffer, ptr, 4)
	arr[3] /= 255
	return "rgba(" + arr.toString() + ")"
}

const getString = (ptr) => {
	let size = 0;
	while (new Uint8ClampedArray(buffer, ptr + size, 1)[0] != 0) {
		size++;
	}
	return (new TextDecoder('ascii')).decode(new Uint8ClampedArray(buffer, ptr, size))
}

let entryFunction = undefined;

WebAssembly.instantiateStreaming(fetch('./build/game_of_life.wasm'), {
	"env": make_environment({
		"SetTraceLogLevel": () => { },
		"InitWindow": (width, height, title_ptr) => {
			canvas.width = width;
			canvas.height = height
			document.querySelector('title').innerText = getString(title_ptr)
		},
		"SetTargetFPS": () => { },
		"BeginDrawing": () => { },
		"EndDrawing": () => {
			pressed_keys = [];
		},
		"ClearBackground": (color) => {
			ctx.fillStyle = getColor(color);
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		},
		"DrawFPS": () => { },
		"js_set_entry": (entry) => {
			entryFunction = w.instance.exports.__indirect_function_table.get(entry);
		},
		"CloseWindow": () => { },
		"IsMouseButtonDown": (m) => {
			switch (m) {
				case 0:
					return left_clicked;
				case 1:
					return right_clicked;
				default:
					console.log("We don't handle that")
			}
		},
		"IsKeyPressed": (key) => pressed_keys.indexOf(key) != -1,
		"GetMouseX": () => mouseX - canvas.offsetLeft,
		"GetMouseY": () => mouseY - canvas.offsetTop,
		"DrawRectangle": (x, y, w, h, c) => {
			ctx.fillStyle = getColor(c);
			ctx.fillRect(x, y, w, h);
		},
		"matrix_random": (scene) => {
			console.log(canvas.width)
			console.log(canvas.height)
			let arr = new Uint8ClampedArray(buffer, scene, canvas.width * canvas.height / 100);
			arr.set(Array.from({ length: canvas.width * canvas.height / 100 }, () => Math.floor(Math.random() + 0.5)))
			return true;
		},
		"memset": (s, c, n) => {
			let arr = new Uint8ClampedArray(buffer, s, n);
			arr.fill(c)
		}

	})
}).then((w0) => {
	w = w0
	buffer = w.instance.exports.memory.buffer

	canvas.addEventListener('mousedown', (e) => {
		switch (e.button) {
			case 0:
				left_clicked = true;
				break;
			case 2:
				right_clicked = true;
				break;
		}
	})
	canvas.addEventListener('mouseup', (e) => {
		switch (e.button) {
			case 0:
				left_clicked = false;
				break;
			case 2:
				right_clicked = false;
				break;
		}
	})
	window.addEventListener('mousemove', (e) => {
		mouseX = e.pageX
		mouseY = e.pageY
	})

	document.addEventListener('keydown', (c) => {
		pressed_keys.push(c.keyCode)
	})

	w0.instance.exports.main()
	const next = (timestamp) => {
		// if (this.quit) {
		// 	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		// 	window.removeEventListener("keydown", keyDown);
		// 	this.#reset()
		// 	return;
		// }
		// let dt = (timestamp - this.previous) / 1000.0;
		previous = timestamp;
		entryFunction();
		window.requestAnimationFrame(next);
	};
	window.requestAnimationFrame((timestamp) => {
		previous = timestamp;
		window.requestAnimationFrame(next);
	});
})
