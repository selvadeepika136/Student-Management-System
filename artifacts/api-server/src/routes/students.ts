import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, studentsTable } from "@workspace/db";
import {
  CreateStudentBody,
  CreateStudentResponse,
  DeleteStudentParams,
  GetStudentParams,
  GetStudentResponse,
  GetStudentsSummaryResponse,
  ListStudentsQueryParams,
  ListStudentsResponse,
  UpdateStudentBody,
  UpdateStudentParams,
  UpdateStudentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const toDateString = (value: Date): string => value.toISOString().slice(0, 10);

router.get("/students/summary", async (req, res): Promise<void> => {
  const [totals] = await db
    .select({
      total: count(),
    })
    .from(studentsTable);
  const [activeTotals] = await db
    .select({ count: count() })
    .from(studentsTable)
    .where(eq(studentsTable.status, "active"));
  const [inactiveTotals] = await db
    .select({ count: count() })
    .from(studentsTable)
    .where(eq(studentsTable.status, "inactive"));

  const departments = await db
    .select({
      department: studentsTable.department,
      count: count(),
    })
    .from(studentsTable)
    .groupBy(studentsTable.department)
    .orderBy(desc(count()));

  const data = {
    total: Number(totals?.total ?? 0),
    active: Number(activeTotals?.count ?? 0),
    inactive: Number(inactiveTotals?.count ?? 0),
    departments: departments.map((item) => ({
      department: item.department,
      count: Number(item.count),
    })),
  };

  res.json(GetStudentsSummaryResponse.parse(data));
});

router.get("/students", async (req, res): Promise<void> => {
  const parsed = ListStudentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, department, year, status } = parsed.data;
  const filters = [];

  if (search) {
    filters.push(
      or(
        ilike(studentsTable.studentId, `%${search}%`),
        ilike(studentsTable.firstName, `%${search}%`),
        ilike(studentsTable.lastName, `%${search}%`),
        ilike(studentsTable.email, `%${search}%`),
      ),
    );
  }
  if (department) filters.push(eq(studentsTable.department, department));
  if (year) filters.push(eq(studentsTable.year, year));
  if (status) filters.push(eq(studentsTable.status, status));

  const students = await db
    .select()
    .from(studentsTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(studentsTable.lastName), asc(studentsTable.firstName));

  res.json(ListStudentsResponse.parse(students));
});

router.post("/students", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [student] = await db
      .insert(studentsTable)
      .values({
        ...parsed.data,
        enrollmentDate: toDateString(parsed.data.enrollmentDate),
      })
      .returning();

    res.status(201).json(CreateStudentResponse.parse(student));
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("students_student_id_unique") ||
        error.message.includes("students_email_unique"))
    ) {
      res.status(409).json({ error: "Student ID or email already exists" });
      return;
    }
    throw error;
  }
});

router.get("/students/:id", async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, params.data.id));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json(GetStudentResponse.parse(student));
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const { enrollmentDate, ...rest } = parsed.data;
    const [student] = await db
      .update(studentsTable)
      .set({
        ...rest,
        ...(enrollmentDate
          ? { enrollmentDate: toDateString(enrollmentDate) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(studentsTable.id, params.data.id))
      .returning();

    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    res.json(UpdateStudentResponse.parse(student));
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("students_student_id_unique") ||
        error.message.includes("students_email_unique"))
    ) {
      res.status(409).json({ error: "Student ID or email already exists" });
      return;
    }
    throw error;
  }
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db
    .delete(studentsTable)
    .where(eq(studentsTable.id, params.data.id))
    .returning({ id: studentsTable.id });

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;