import mongoose from "mongoose";

app.get("/debug-save", async (req, res) => {
  const TestSchema = new mongoose.Schema({ name: String });
  const Test = mongoose.model("DebugTest", TestSchema);

  const doc = await Test.create({ name: "AutoLearn Test" });

  res.json(doc);
});
