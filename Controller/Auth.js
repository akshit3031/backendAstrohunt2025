// const user = require("../Model/User");
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const team = require("../Model/Team");
// require("dotenv").config();


// exports.signup= async (req,res)=>{
//     try{
//         const{
//             teamName,
//             leadName,
//             leadEmail,
//             leadRollNo,
//             leadPhoneNo,
//             password,
//             confirmPassword,
//             member
//         } = req.body;
        
//         if(!teamName || !leadName || !leadEmail || !leadRollNo || !leadPhoneNo || !password || !confirmPassword || !member){
//             return res.status(400).json({
//                 success:false,
//                 message:"All fields are required"
//             })
//         }
//         if(password !==confirmPassword){
//             return res.status(400).json({
//                 success:false,
//                 message:"Password and Confirm Password does not match"
//             })
//         }

//         const userExists = await user.findOne({email:leadEmail});
//         if(userExists){
//             return res.status(400).json({
//                 success:false,
//                 message:"User already exists with this email"
//             })
//         }
        
//         const teamExists = await user.findOne({teamName:teamName});
//         if(teamExists){
//             return res.status(400).json({
//                 success:false,
//                 message:"Team already exists with this name"
//             })
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);


//         // create a team lead
//         const teamLead = await user.create({
//             name: leadName,
//             email: leadEmail,
//             password: hashedPassword,
//             rollNo: leadRollNo,
//             phoneNo: leadPhone,
//             isTeamLead: true
//           });

//         //   create a team 
//         const team = await team.create({
//                 teamName,
//                 teamLead: teamLead._id,
//                 members: members.map(member => ({
//             name: member.name,
//             email: member.email,
//             rollNo: member.rollNo
//         }))
//     });

//     teamLead.team = team._id;
//       await teamLead.save();

//     return res.status(200).json({
//         success: true,
//         teamLead,team,
//         message: "User registered successfully",
//       });
//  }

//     catch(error){
//         return res.status(500).json({
//             success:false,
//             message:error.message
//         })
//     }
// }

// exports.login = async (req, res) => {
//     try {
//       const { email, password } = req.body;
  
//       if (!email || !password) {
//         return res.status(400).json({
//           success: false,
//           message: `Please Fill up All the Required Fields`,
//         });
//       }
  
//       const user = await user.findOne({ email });
  
//       if (!user) {
//         return res.status(401).json({
//           success: false,
//           message: `User is not Registered with Us Please SignUp to Continue`,
//         });
//       }
  
//       if (await bcrypt.compare(password, user.password)) {
//         const token = jwt.sign(
//           { email: user.email, id: user._id, role: user.role },
//           process.env.JWT_SECRET,
//           {
//             expiresIn: "24h",
//           }
//         );
  
//         user.token = token;
//         user.password = undefined;
  
//         const options = {
//           expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
//           httpOnly: true,
//         };
//         res.cookie("token", token, options).status(200).json({
//           success: true,
//           token,
//           user,
//           message: `User Login Success`,
//         });
//       } else {
//         return res.status(401).json({
//           success: false,
//           message: `Password is incorrect`,
//         });
//       }
//     } catch (error) {
//       console.error(error);
  
//       return res.status(500).json({
//         success: false,
//         message: `Login Failure Please Try Again`,
//       });
//     }
//   };
  