import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Task } from "@prisma/client";
import request from "supertest";

vi.mock("../../services/task.service.js", () => ({
	findAll: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	remove: vi.fn(),
}));

import * as taskService from "../../services/task.service.js";
import app from "../../app.js";

const mockService = vi.mocked(taskService);

const mockTask: Task = {
	id: 1,
	title: "Routed Task",
	description: "via router",
	completed: false,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const serialized = JSON.parse(JSON.stringify(mockTask));

describe("Task routes wiring", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("GET /api/tasks routes to getAllTasks", async () => {
		mockService.findAll.mockResolvedValue([mockTask]);

		const res = await request(app).get("/api/tasks");

		expect(res.status).toBe(200);
		expect(res.body).toEqual([serialized]);
	});

	it("GET /api/tasks/:id routes to getTaskById", async () => {
		mockService.findById.mockResolvedValue(mockTask);

		const res = await request(app).get("/api/tasks/1");

		expect(res.status).toBe(200);
		expect(res.body).toEqual(serialized);
	});

	it("POST /api/tasks routes to createTask", async () => {
		mockService.create.mockResolvedValue(mockTask);

		const res = await request(app)
			.post("/api/tasks")
			.send({ title: "Routed Task", description: "via router" });

		expect(res.status).toBe(201);
		expect(mockService.create).toHaveBeenCalledWith({
			title: "Routed Task",
			description: "via router",
		});
	});

	it("PUT /api/tasks/:id routes to updateTask", async () => {
		mockService.update.mockResolvedValue({ ...mockTask, completed: true });

		const res = await request(app)
			.put("/api/tasks/1")
			.send({ completed: true });

		expect(res.status).toBe(200);
		expect(mockService.update).toHaveBeenCalledWith(1, {
			title: undefined,
			description: undefined,
			completed: true,
		});
	});

	it("DELETE /api/tasks/:id routes to deleteTask", async () => {
		mockService.remove.mockResolvedValue(mockTask);

		const res = await request(app).delete("/api/tasks/1");

		expect(res.status).toBe(204);
		expect(mockService.remove).toHaveBeenCalledWith(1);
	});
});
