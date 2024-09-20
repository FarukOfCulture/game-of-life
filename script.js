canvas = document.querySelector('canvas')
ctx = canvas.getContext("2d")

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
w = 0;

entryFunction = undefined;

WebAssembly.instantiateStreaming(fetch('./build/game_of_life.wasm'), {
	"env": make_environment({
		"SetTraceLogLevel": () => { },
		"InitWindow": (width, height, title_ptr) => { canvas.width = width; canvas.height = height },
		"SetTargetFPS": () => { },
		"BeginDrawing": () => { },
		"EndDrawing": () => {
			pause_pressed = false;
		},
		"ClearBackground": (Color) => {
			ctx.fillStyle = "red";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		},
		"DrawFPS": () => { },
		"js_set_entry": (entry) => {
			entryFunction = w.instance.exports.__indirect_function_table.get(entry);
		},
		"CloseWindow": () => { },
		"IsMouseButtonDown": () => clicked,
		"IsKeyPressed": () => pause_pressed,
		"GetMouseX": () => mouseX - canvas.offsetLeft,
		"GetMouseY": () => mouseY - canvas.offsetTop,
		"DrawRectangle": (x, y, w, h, c) => {
			ctx.fillStyle = "black";
			ctx.fillRect(x, y, w, h);
		}

	})
}).then((w0) => {
	w = w0
	console.log(w0);
	previous = undefined;
	clicked = false;
	pause_pressed = false;
	mouseX = undefined
	mouseY = undefined

	canvas.addEventListener('mousedown', (e) => {
		e.preventDefault()

		clicked = true;
	})
	canvas.addEventListener('mouseup', () => {
		clicked = false;
	})
	window.addEventListener('mousemove', (e) => {
		mouseX = e.pageX
		mouseY = e.pageY
	})

	document.addEventListener('keydown', (c) => {
		if (c.key == "p")
			pause_pressed = true;
	})

	w0.instance.exports.main()
	const next = (timestamp) => {
		// if (this.quit) {
		// 	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		// 	window.removeEventListener("keydown", keyDown);
		// 	this.#reset()
		// 	return;
		// }
		dt = (timestamp - this.previous) / 1000.0;
		previous = timestamp;
		entryFunction();
		window.requestAnimationFrame(next);
	};
	window.requestAnimationFrame((timestamp) => {
		previous = timestamp;
		window.requestAnimationFrame(next);
	});
})
