import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { once } from "node:events";
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/test";
process.env.JWT_SECRET = "test-only-secret-never-used-in-production";
process.env.ADMIN_API_KEY = "test-only-api-key-never-used-in-production";
process.env.FRONTEND_URL = "http://localhost:3000";
const { app } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { rateLimit } = await import("../src/middleware/security.js");
const { dateSchema, passwordSchema, emailSchema } = await import("../src/lib/validation.js");
const sid = "12345678-1234-4234-8234-123456789012", cid = "12345678-1234-4234-8234-123456789013";
const customer = { id: cid, name: "Cliente Prueba", email: "cliente@example.com", phone: "88888888", customerCode: "JAM-TEST", role: "CUSTOMER", tokenVersion: 0, purchasePoints: 0, referralPoints: 0, referralCount: 0 };
let staff, created, whereDetail;
prisma.staffAccount.findUnique = async () => staff ? { tokenVersion: 0, ...staff } : null;
prisma.user.findUnique = async () => customer;
prisma.user.create = async ({data}) => { created = data; return {...customer, ...data}; };
prisma.serviceOrder.findFirst = async ({where}) => { whereDetail = where; return null; };
prisma.serviceOrder.findMany = async () => [];
const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
const token = (kind) => jwt.sign({sub: kind === "customer" ? cid : sid, kind, version: 0}, process.env.JWT_SECRET, {expiresIn:"1h"});
async function request(path, kind, body, extra = {}) {
 return fetch(base + path, {method: body === undefined ? "GET" : "POST", headers: {...(kind ? {Authorization:`Bearer ${token(kind)}`} : {}), "Content-Type":"application/json", ...extra}, ...(body === undefined ? {} : {body:JSON.stringify(body)})});
}
test.after(async () => { await new Promise(r => server.close(r)); await prisma.$disconnect(); });
test("acceso anónimo rechazado", async () => assert.equal((await request("/api/staff/me")).status,401));
test("recepción crea clientes sin exponer contraseña ni iniciar su sesión", async () => {
 staff = {id:sid,email:"flor@example.com",role:"RECEPTION",active:true};
 const r = await request("/api/staff/customers","staff",{name:"Cliente Prueba",email:" CLIENTE@EXAMPLE.COM ",phone:"88888888",password:"Test-password-123",confirmPassword:"Test-password-123"});
 assert.equal(r.status,201); const data = await r.json();
 assert.equal(data.customer.email,"cliente@example.com");assert.equal(data.token,undefined);assert.equal(data.customer.passwordHash,undefined);
 assert.equal(await bcrypt.compare("Test-password-123",created.passwordHash),true);
});
test("recepción tiene las mismas operaciones que mecánicos y conserva validación", async () => {
 for (const role of ["RECEPTION", "MECHANIC"]) {
  staff = {id:sid,email:"personal@example.com",role,active:true};
  assert.equal((await request("/api/workshop/staff/orders","staff")).status,200);
  for (const [path,body] of [["/api/staff/points",{}],["/api/workshop/staff/orders",{}],[`/api/workshop/staff/orders/${cid}/updates`,{}]]) {
   assert.equal((await request(path,"staff",body)).status,400);
  }
  assert.equal((await request("/api/admin-portal/me","staff")).status,401);
 }
 staff = {id:sid,email:"flor@example.com",role:"RECEPTION",active:false};
 assert.equal((await request("/api/workshop/staff/orders","staff")).status,401);
});
test("mecánico activo puede acceder; una cuenta desactivada no", async () => {
 staff = {id:sid,email:"isaac@example.com",role:"MECHANIC",active:true};
 assert.equal((await request("/api/workshop/staff/orders","staff")).status,200);staff.active=false;
 assert.equal((await request("/api/workshop/staff/orders","staff")).status,401);
});
test("sesiones de cliente, staff y admin mantienen sus permisos", async () => {
 staff = {id:sid,email:"staff@example.com",role:"MECHANIC",active:true};
 assert.equal((await request("/api/staff/me","customer")).status,401);
 assert.equal((await request("/api/auth/me","admin")).status,401);
 assert.equal((await request("/api/admin-portal/me","staff")).status,401);
 assert.equal((await request("/api/admin-portal/me","admin")).status,401);
 staff.email="automotrizjamirosc@gmail.com";
 assert.equal((await request("/api/admin-portal/me","admin")).status,200);
});
test("detalle de orden restringido al propietario", async () => {
 assert.equal((await request(`/api/workshop/customer/orders/${sid}`,"customer")).status,404);
 assert.deepEqual(whereDetail,{id:sid,customerId:cid});
});
test("CORS y JSON inválidos producen errores controlados", async () => {
 assert.equal((await request("/api/health",undefined,undefined,{Origin:"https://attacker.example"})).status,403);
 const r=await fetch(base+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:"{"});
 assert.equal(r.status,400);assert.equal(r.headers.get("cache-control"),"no-store");
});
test("rechaza fotos falsas y fechas imposibles", async () => {
 staff={id:sid,email:"staff@example.com",role:"MECHANIC",active:true};
 assert.equal((await request(`/api/workshop/staff/orders/${cid}/updates`,"staff",{status:"DIAGNOSIS",note:"Prueba",photos:["data:image/png;base64,PHNjcmlwdD4="]})).status,400);
 assert.equal(dateSchema.safeParse("2026-02-30").success,false);assert.equal(dateSchema.safeParse("2028-02-29").success,true);
 assert.equal(passwordSchema.safeParse("á".repeat(40)).success,false);assert.equal(emailSchema.parse(" FLOR@EXAMPLE.COM "),"flor@example.com");
});
test("un token revocado queda rechazado", async () => {
 staff={id:sid,email:"staff@example.com",role:"MECHANIC",active:true,tokenVersion:1};
 assert.equal((await request("/api/staff/me","staff")).status,401);
});
test("limitador bloquea repeticiones y distingue direcciones",()=>{
 const limit=rateLimit({limit:2,windowMs:60000});let blocked=0,allowed=0;
 const res={set(){},status(code){assert.equal(code,429);return this;},json(){blocked++;}};
 for(const ip of ["one","one","one","two"])limit({ip},res,()=>allowed++);
 assert.equal(allowed,3);assert.equal(blocked,1);
});

test("login staff valida contraseña y devuelve rol de recepción", async () => {
 staff={id:sid,name:"Flor",email:"flor@example.com",role:"RECEPTION",active:true,tokenVersion:0,passwordHash:await bcrypt.hash("Test-password-123",12)};
 const r=await request("/api/staff/login",undefined,{email:" FLOR@EXAMPLE.COM ",password:"Test-password-123"});
 assert.equal(r.status,200);const data=await r.json();assert.equal(data.staff.role,"RECEPTION");assert.equal(data.staff.passwordHash,undefined);assert.equal(jwt.verify(data.token,process.env.JWT_SECRET).version,0);
 assert.equal((await request("/api/staff/login",undefined,{email:"flor@example.com",password:"incorrecta"})).status,401);
});
test("rechaza tokens vencidos y tokens con firma incorrecta",async()=>{
 for(const bearer of [jwt.sign({sub:sid,kind:"staff",version:0},"another-secret",{expiresIn:"1h"}),jwt.sign({sub:sid,kind:"staff",version:0},process.env.JWT_SECRET,{expiresIn:-1})]){
  const r=await fetch(base+"/api/staff/me",{headers:{Authorization:`Bearer ${bearer}`}});assert.equal(r.status,401);
 }
});

test("logout invalida el token en el servidor",async()=>{
 staff={id:sid,name:"Isaac",email:"isaac@example.com",role:"MECHANIC",active:true,tokenVersion:0};
 prisma.staffAccount.update=async()=>{staff.tokenVersion+=1;return staff;};
 assert.equal((await request("/api/staff/logout","staff",{})).status,200);
 assert.equal((await request("/api/staff/me","staff")).status,401);
});
test("registro exige confirmación, ocho caracteres, mayúscula y número",async()=>{
 const {customerRegistrationSchema}=await import('../src/lib/validation.js');
 const baseInput={name:'Cliente Prueba',email:'cliente@example.com',phone:'88888888'};
 for(const [password,confirmPassword] of [['Abc1234','Abc1234'],['abcdefgh1','abcdefgh1'],['Abcdefgh','Abcdefgh'],['Abcdefg1','Otra1234'],['Abcdefg1',undefined]]){
  assert.equal(customerRegistrationSchema.safeParse({...baseInput,password,confirmPassword}).success,false);
  assert.equal((await request('/api/auth/register',undefined,{...baseInput,password,confirmPassword})).status,400);
 }
 for(const password of ['Abcdefg1','ABCDEFG1','Ñabcdef1'])assert.equal(customerRegistrationSchema.safeParse({...baseInput,password,confirmPassword:password}).success,true);
});
