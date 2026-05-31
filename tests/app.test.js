const request = require('supertest');
const app = require('../src/app');

describe('Health Check', () => {
  it('GET /health returns UP status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Users API', () => {
  it('GET /api/users returns array of users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/users/:id returns a single user', async () => {
    const res = await request(app).get('/api/users/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.name).toBeDefined();
  });

  it('GET /api/users/:id returns 404 for unknown user', async () => {
    const res = await request(app).get('/api/users/9999');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('POST /api/users creates a new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Charlie', email: 'charlie@example.com' });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Charlie');
    expect(res.body.email).toBe('charlie@example.com');
    expect(res.body.id).toBeDefined();
  });

  it('POST /api/users returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'noemail@example.com' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/users returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'NoEmail' });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /api/users/:id deletes a user', async () => {
    const create = await request(app)
      .post('/api/users')
      .send({ name: 'ToDelete', email: 'delete@example.com' });
    const id = create.body.id;

    const del = await request(app).delete(`/api/users/${id}`);
    expect(del.statusCode).toBe(204);

    const get = await request(app).get(`/api/users/${id}`);
    expect(get.statusCode).toBe(404);
  });

  it('DELETE /api/users/:id returns 404 for unknown user', async () => {
    const res = await request(app).delete('/api/users/9999');
    expect(res.statusCode).toBe(404);
  });
});

describe('Metrics endpoint', () => {
  it('GET /metrics returns prometheus format', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });
});
