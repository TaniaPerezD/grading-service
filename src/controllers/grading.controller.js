const gradingService = require('../services/grading.service');

const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const result = await gradingService.gradeSubmission(submissionId);

    res.status(201).json({
      message: 'Envío calificado correctamente',
      result
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al calificar el envío',
      error: error.message
    });
  }
};

const getGradingBySubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const result = await gradingService.getGradingBySubmission(submissionId);

    if (!result) {
      return res.status(404).json({
        message: 'No existe calificación para este envío'
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener calificación',
      error: error.message
    });
  }
};

const getAllResults = async (req, res) => {
  try {
    const results = await gradingService.getAllResults();
    res.json(results);
  } catch (error) {
    res.status(500).json({
      message: 'Error al listar resultados',
      error: error.message
    });
  }
};

module.exports = {
  gradeSubmission,
  getGradingBySubmission,
  getAllResults
};