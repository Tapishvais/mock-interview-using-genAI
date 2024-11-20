"use client"
import { Button } from "@/components/ui/button";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import Webcam from "react-webcam";
import useSpeechToText from 'react-hook-speech-to-text';
import { Mic, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { chatSession } from "@/utils/GeminiAiModel";
import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { useUser } from "@clerk/nextjs";
import moment from "moment";

function RecordAnswerSection({mockInterviewQuestion, activeQuestionIndex, interviewData}) {

  const [userAnswer,setUserAnswer] = useState('');
  const {user} = useUser();
  const [loading, setLoading] = useState(false);

  const {
    error,
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
    setResults
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false
  });

  useEffect(()=>{
    results.map((result)=>(
      setUserAnswer(prevAns=>prevAns+result?.transcript)
    ))
  },[results])

  useEffect(()=>{
    if(!isRecording&&userAnswer.length>10){
      UpdateUserAnswer();
    }
  },[userAnswer])

  const StartStopRecording =async()=>{
    if(isRecording){
      stopSpeechToText()
    }
    else{
      startSpeechToText()
    }
  }

  const UpdateUserAnswer = async () => {
    console.log(userAnswer);
    setLoading(true);
  
    const feedbackPrompt =
      "Question:" +
      mockInterviewQuestion[activeQuestionIndex]?.Question +
      ", User Answer:" +
      userAnswer +
      ", Depends on question and user answer for give interview question" +
      " please give us rating for answer and feedback as area of improvement if any" +
      " in just 3 to 5 lines to improve it in JSON format with rating field and feedback field";
  
    try {
      // Retry logic with exponential backoff
      const sendMessageWithRetry = async (prompt, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await chatSession.sendMessage(prompt);
          } catch (error) {
            if (error.message.includes("503") && i < retries - 1) {
              console.warn(`Retrying... Attempt ${i + 1}`);
              toast.info(`Server is busy. Retrying... (${i + 1}/${retries})`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay *= 2; // Double the delay for each retry
            } else {
              throw error;
            }
          }
        }
      };
  
      const result = await sendMessageWithRetry(feedbackPrompt);
      const mockJsonResp = result.response
        .text()
        .replace("```json", "")
        .replace("```", "");
      console.log(mockJsonResp);
  
      const JsonFeedbackResp = JSON.parse(mockJsonResp);
      const correctAnsValue =
        mockInterviewQuestion[activeQuestionIndex]?.answer || "Answer not provided";
      console.log("Correct Answer:", correctAnsValue);
  
      const resp = await db.insert(UserAnswer).values({
        mockIdRef: interviewData?.mockId,
        question: mockInterviewQuestion[activeQuestionIndex]?.Question,
        correctAns: correctAnsValue,
        userAns: userAnswer,
        feedback: JsonFeedbackResp?.feedback,
        rating: JsonFeedbackResp?.rating,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        createdAt: moment().format("DD-MM-yyyy"),
      });
  
      if (resp) {
        toast.success("User Answer recorded successfully");
        setUserAnswer("");
        setResults([]);
      }
    } catch (error) {
      console.error("An error occurred:", error);
  
      if (error.message.includes("503")) {
        toast.error(
          "The AI model is currently overloaded. Please try again in a few moments."
        );
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setResults([]);
      setLoading(false);
    }
  };
  
  

  return (
    <div className="flex justify-center items-center flex-col">
      <div className="flex flex-col mt-20 justify-center items-center bg-black rounded-lg p-5">
        <Image
          src={"/webcam.svg"}
          width={200}
          height={200}
          className="absolute"
        />
        <Webcam
          mirrored={true}
          style={{
            height: 300,
            width: 100 % Image,
            zIndex: 10,
          }}
        />
      </div>
      
      <Button
      disabled={loading}
       variant='outline' className='my-10'
      onClick={StartStopRecording}
      >
      {isRecording?
        <h2 className="text-red-600 flex gap-2 animate-pulse items-center justify-between">
          <StopCircle/>Stop Recording...
        </h2>
        :
        <h2 className="text-primary flex gap-2 items-center">
        <Mic/>Record Answer</h2>}</Button>
    </div>
  );
}

export default RecordAnswerSection;
