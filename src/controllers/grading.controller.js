const gradingService = require("../services/grading.service");

const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const result = await gradingService.gradeSubmission(submissionId);

    res.status(201).json({
      message: "Envío calificado correctamente",
      result,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al calificar el envío",
      error: error.message,
    });
  }
};

const updateGradeManually = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { final_score, user_id, reason } = req.body;

    const result = await gradingService.updateGradeManually(
      submissionId,
      final_score,
      user_id,
      reason
    );

    res.json({
      message: "Nota actualizada correctamente",
      result,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar nota",
      error: error.message,
    });
  }
};

const getGradingBySubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const result = await gradingService.getGradingBySubmission(submissionId);

    if (!result) {
      return res.status(404).json({
        message: "No existe calificación para este envío",
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener calificación",
      error: error.message,
    });
  }
};

const getStudentAttemptsByAssignment = async (req, res) => {
  try {
    const { assignmentId, studentId } = req.params;

    const attempts = await gradingService.getStudentAttemptsByAssignment(
      assignmentId,
      studentId
    );

    res.json({
      ok: true,
      total: attempts.length,
      attempts,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener intentos del estudiante",
      error: error.message,
    });
  }
};

const getAllResults = async (req, res) => {
  try {
    const results = await gradingService.getAllResults();
    res.json(results);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar resultados",
      error: error.message,
    });
  }
};

module.exports = {
  gradeSubmission,
  updateGradeManually,
  getGradingBySubmission,
  getStudentAttemptsByAssignment,
  getAllResults,
};