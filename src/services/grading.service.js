const pool = require("../config/db");

const calculateScore = (sourceCodeRaw) => {
  const sourceCode = String(sourceCodeRaw || "").toLowerCase();

  let score = 0;
  const logs = [];

  if (sourceCode.includes("function") || sourceCode.includes("=>")) {
    score += 20;
    logs.push("Usa funciones.");
  }

  if (sourceCode.includes("if")) {
    score += 20;
    logs.push("Usa condicionales.");
  }

  if (sourceCode.includes("for") || sourceCode.includes("while")) {
    score += 20;
    logs.push("Usa ciclos.");
  }

  if (sourceCode.includes("console.log") || sourceCode.includes("return")) {
    score += 20;
    logs.push("Genera una salida.");
  }

  if (sourceCode.length > 30) {
    score += 20;
    logs.push("El código tiene desarrollo suficiente.");
  }

  if (score > 100) score = 100;

  return {
    score,
    executionStatus: score >= 50 ? "success" : "failed",
    logs: logs.join(" "),
  };
};

const gradeSubmission = async (submissionId) => {
  const submissionResult = await pool.query(
    `
    select 
      s.id,
      s.source_code,
      s.assignment_id,
      s.student_id,
      s.status,
      a.title as assignment_title
    from submissions s
    join assignments a on a.id = s.assignment_id
    where s.id = $1
    `,
    [submissionId]
  );

  if (submissionResult.rows.length === 0) {
    throw new Error("El envío no existe");
  }

  const submission = submissionResult.rows[0];
  const calculated = calculateScore(submission.source_code);

  const result = await pool.query(
    `
    insert into grading_results (
      submission_id,
      final_score,
      execution_status,
      execution_output,
      execution_logs
    )
    values ($1, $2, $3, $4, $5)
    on conflict (submission_id)
    do update set
      final_score = excluded.final_score,
      execution_status = excluded.execution_status,
      execution_output = excluded.execution_output,
      execution_logs = excluded.execution_logs,
      graded_at = current_timestamp
    returning *
    `,
    [
      submissionId,
      calculated.score,
      calculated.executionStatus,
      "Ejecución simulada correctamente",
      calculated.logs,
    ]
  );

  await pool.query(
    `
    update submissions
    set status = 'graded'
    where id = $1
    `,
    [submissionId]
  );

  await pool.query(
    `
    insert into audit_logs (
      user_id,
      service_name,
      action,
      entity_name,
      entity_id,
      new_value,
      description
    )
    values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      submission.student_id,
      "grading-service",
      "CODIGO_CALIFICADO",
      "grading_results",
      result.rows[0].id,
      JSON.stringify(result.rows[0]),
      `El envío ${submissionId} fue calificado con nota ${calculated.score}`,
    ]
  );

  return result.rows[0];
};

const updateGradeManually = async (submissionId, finalScore, userId, reason) => {
  const score = Number(finalScore);

  if (Number.isNaN(score) || score < 0 || score > 100) {
    throw new Error("La nota debe estar entre 0 y 100");
  }

  const submissionResult = await pool.query(
    `
    select 
      s.id,
      s.student_id,
      s.source_code
    from submissions s
    where s.id = $1
    `,
    [submissionId]
  );

  if (submissionResult.rows.length === 0) {
    throw new Error("El envío no existe");
  }

  const existingResult = await pool.query(
    `select * from grading_results where submission_id = $1`,
    [submissionId]
  );

  let oldValue = existingResult.rows[0] || null;

  const result = await pool.query(
    `
    insert into grading_results (
      submission_id,
      final_score,
      execution_status,
      execution_output,
      execution_logs
    )
    values ($1, $2, $3, $4, $5)
    on conflict (submission_id)
    do update set
      final_score = excluded.final_score,
      execution_status = excluded.execution_status,
      execution_output = excluded.execution_output,
      execution_logs = excluded.execution_logs,
      graded_at = current_timestamp
    returning *
    `,
    [
      submissionId,
      score,
      score >= 50 ? "success" : "failed",
      "Nota ajustada manualmente por el profesor",
      reason || "Ajuste manual de calificación.",
    ]
  );

  await pool.query(
    `
    update submissions
    set status = 'graded'
    where id = $1
    `,
    [submissionId]
  );

  await pool.query(
    `
    insert into audit_logs (
      user_id,
      service_name,
      action,
      entity_name,
      entity_id,
      old_value,
      new_value,
      description
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      userId || submissionResult.rows[0].student_id,
      "grading-service",
      "NOTA_MODIFICADA_MANUALMENTE",
      "grading_results",
      result.rows[0].id,
      oldValue ? JSON.stringify(oldValue) : null,
      JSON.stringify(result.rows[0]),
      `La nota del envío ${submissionId} fue modificada manualmente a ${score}`,
    ]
  );

  return result.rows[0];
};

const getGradingBySubmission = async (submissionId) => {
  const result = await pool.query(
    `
    select *
    from grading_results
    where submission_id = $1
    `,
    [submissionId]
  );

  return result.rows[0];
};

const getStudentAttemptsByAssignment = async (assignmentId, studentId) => {
  const result = await pool.query(
    `
    select
      s.id as submission_id,
      s.assignment_id,
      s.student_id,
      s.attempt_number,
      s.status,
      s.language,
      s.submitted_at,
      gr.final_score,
      gr.execution_status,
      gr.graded_at
    from submissions s
    left join grading_results gr on gr.submission_id = s.id
    where s.assignment_id = $1
    and s.student_id = $2
    order by s.attempt_number desc
    `,
    [assignmentId, studentId]
  );

  return result.rows;
};

const getAllResults = async () => {
  const result = await pool.query(
    `
    select 
      gr.id,
      gr.submission_id,
      gr.final_score,
      gr.execution_status,
      gr.execution_output,
      gr.execution_logs,
      gr.graded_at,
      s.attempt_number,
      s.status as submission_status,
      u.full_name as student_name,
      u.email as student_email,
      a.id as assignment_id,
      a.title as assignment_title
    from grading_results gr
    join submissions s on s.id = gr.submission_id
    join users_app u on u.id = s.student_id
    join assignments a on a.id = s.assignment_id
    order by gr.graded_at desc
    `
  );

  return result.rows;
};

module.exports = {
  gradeSubmission,
  updateGradeManually,
  getGradingBySubmission,
  getStudentAttemptsByAssignment,
  getAllResults,
};