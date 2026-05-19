const express = require('express');
const router = express.Router();

const {
  gradeSubmission,
  getGradingBySubmission,
  getAllResults
} = require('../controllers/grading.controller');

router.post('/:submissionId', gradeSubmission);
router.get('/submission/:submissionId', getGradingBySubmission);
router.get('/results/all', getAllResults);

module.exports = router;