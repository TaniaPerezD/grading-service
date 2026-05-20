const express = require("express");
const router = express.Router();

const {
  gradeSubmission,
  updateGradeManually,
  getGradingBySubmission,
  getStudentAttemptsByAssignment,
  getAllResults,
} = require("../controllers/grading.controller");

router.post("/:submissionId", gradeSubmission);
router.patch("/:submissionId/manual", updateGradeManually);

router.get("/submission/:submissionId", getGradingBySubmission);
router.get("/attempts/:assignmentId/:studentId", getStudentAttemptsByAssignment);
router.get("/results/all", getAllResults);

module.exports = router;