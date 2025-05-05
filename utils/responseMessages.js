const handleSuccessMessages = (res,message,data) => {
  return res.json({
    status: 200,
    data,
    message: message,
  });
};
const handleErrorMessages = (res,message) => {
  return res.json({
    status: 400,
    message: message,
  });
};
module.exports={
    handleSuccessMessages,handleErrorMessages
}