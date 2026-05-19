const pool = require('../config/db');

const gradeSubmission = async (submissionId) => {
  const submissionQuery = `
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
  `;

  const submissionResult = await pool.query(submissionQuery, [submissionId]);

  if (submissionResult.rows.length === 0) {
    throw new Error('El envío no existe');
  }

  const submission = submissionResult.rows[0];

  const existingResult = await pool.query(
    'select * from grading_results where submission_id = $1',
    [submissionId]
  );

  if (existingResult.rows.length > 0) {
    throw new Error('Este envío ya fue calificado');
  }

  const sourceCode = submission.source_code.toLowerCase();

  let score = 0;
  let logs = [];

  if (sourceCode.includes('function') || sourceCode.includes('=>')) {
    score += 20;
    logs.push('Usa funciones.');
  }

  if (sourceCode.includes('if')) {
    score += 20;
    logs.push('Usa condicionales.');
  }

  if (sourceCode.includes('for') || sourceCode.includes('while')) {
    score += 20;
    logs.push('Usa ciclos.');
  }

  if (sourceCode.includes('console.log') || sourceCode.includes('return')) {
    score += 20;
    logs.push('Genera una salida.');
  }

  if (sourceCode.length > 30) {
    score += 20;
    logs.push('El código tiene desarrollo suficiente.');
  }

  if (score > 100) score = 100;

  const executionStatus = score >= 50 ? 'success' : 'failed';

  const insertResult = await pool.query(
    `
    insert into grading_results (
      submission_id,
      final_score,
      execution_status,
      execution_output,
      execution_logs
    )
    values ($1, $2, $3, $4, $5)
    returning *
    `,
    [
      submissionId,
      score,
      executionStatus,
      'Ejecución simulada correctamente',
      logs.join(' ')
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
      'grading-service',
      'CODIGO_CALIFICADO',
      'grading_results',
      insertResult.rows[0].id,
      JSON.stringify(insertResult.rows[0]),
      `El envío ${submissionId} fue calificado con nota ${score}`
    ]
  );

  return insertResult.rows[0];
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
      u.full_name as student_name,
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
  getGradingBySubmission,
  getAllResults
};