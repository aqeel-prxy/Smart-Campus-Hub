# Smart Campus Hub - Contribution Guidelines

## 🎯 **Welcome Contributors!**

This guide helps team members contribute effectively to the Smart Campus Hub project while ensuring proper credit attribution and smooth collaboration.

## 🚀 **Getting Started**

### **Prerequisites**
- Git installed and configured
- GitHub account
- Node.js and Java development environments
- MongoDB for local testing

### **Quick Setup**
```bash
# 1. Clone the repository
git clone https://github.com/aqeel-prxy/Smart-Campus-Hub.git
cd Smart-Campus-Hub

# 2. Configure your Git credentials
git config --global user.name "Your-Username"
git config --global user.email "your-email@example.com"

# 3. Create your feature branch
git checkout -b feature/module-{letter}-{feature-name}

# 4. Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

## 🌟 **Module Assignment System**

### **Module A: User Authentication & Dashboard**
- **Focus**: Login, registration, user profiles, dashboard
- **Branch Pattern**: `feature/module-a-*`
- **Key Technologies**: Spring Security, React, JWT

### **Module B: Resource Booking System**
- **Focus**: Resource catalog, booking calendar, availability
- **Branch Pattern**: `feature/module-b-*`
- **Key Technologies**: Spring Boot, React, Calendar integration

### **Module C: Ticketing System** ✅ **COMPLETED**
- **Lead**: aqeel-prxy
- **Status**: Fully implemented and merged
- **Reference**: Use as template for structure and quality

### **Module D: Analytics & Reporting**
- **Focus**: Usage analytics, reports, dashboards
- **Branch Pattern**: `feature/module-d-*`
- **Key Technologies**: Spring Boot, Charts.js, Data visualization

## 📋 **Development Workflow**

### **1. Branch Creation**
```bash
# Always create a new branch for your work
git checkout -b feature/module-a-user-authentication
```

### **2. Development Guidelines**
- Follow existing code structure
- Write clean, commented code
- Add tests for new features
- Update documentation

### **3. Commit Standards**
```bash
# Good commit format
git commit -m "feat/module-a: Add user registration functionality

- Implement user registration endpoint
- Add email validation
- Create registration form component
- Add success/error handling

Module A: User Authentication System"
```

### **4. Testing Requirements**
- Unit tests for business logic
- Integration tests for APIs
- Manual testing of UI components
- Cross-browser compatibility

## 🎨 **Code Style Guidelines**

### **Java Backend (Spring Boot)**
```java
// Controller example
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @PostMapping("/register")
    public ResponseEntity<User> registerUser(@RequestBody UserRegistrationDto dto) {
        // Implementation
    }
}
```

### **React Frontend**
```jsx
// Component example
const UserRegistration = () => {
    const [formData, setFormData] = useState(initialState);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Implementation
    };
    
    return (
        <div className="registration-container">
            {/* JSX content */}
        </div>
    );
};
```

## 🔄 **Pull Request Process**

### **Before Creating PR**
- [ ] All tests passing
- [ ] Code follows project style
- [ ] Documentation updated
- [ ] No sensitive data committed

### **PR Template**
```markdown
## 🎯 Module {LETTER}: {Module Name}
- **Contributor**: @your-username
- **Branch**: feature/module-{letter}-{feature-name}

## 🚀 Changes
- [ ] Feature 1: Description
- [ ] Feature 2: Description
- [ ] Bug fixes: Description
- [ ] Documentation: Updated

## 🧪 Testing
- [ ] Unit tests: Passing
- [ ] Integration tests: Working
- [ ] Manual testing: Completed
- [ ] Browser compatibility: Tested

## 📸 Screenshots
<!-- Add screenshots of your implementation -->

## 🔗 Integration
- Affects other modules: Yes/No
- Breaking changes: Yes/No
- Additional setup required: Yes/No
```

## 🏆 **Credit & Attribution**

### **How You Get Credit**
1. **Git Commits**: Your GitHub username appears in commit history
2. **Pull Requests**: PR author clearly visible
3. **Contribution Graph**: GitHub tracks your contributions
4. **Module Documentation**: Your name in module docs

### **Ensuring Proper Credit**
- Always use your GitHub email in Git config
- Make meaningful commits with your name
- Create PRs from your branches
- Update module documentation with your details

## 📊 **Project Structure Reference**

### **Backend (Java + Node.js)**
```
backend/
├── src/main/java/com/backend/backend/
│   ├── controllers/     # Your REST endpoints
│   ├── services/       # Business logic
│   ├── repositories/   # Database operations
│   ├── models/         # Entity classes
│   └── config/         # Configuration
├── server.js          # Node.js server (Module C reference)
└── pom.xml           # Maven configuration
```

### **Frontend (React)**
```
frontend/src/
├── pages/             # Your page components
├── components/        # Reusable components
├── services/          # API calls
├── assets/           # Images, icons
└── tests/            # Test files
```

## 🔐 **Security Guidelines**

### **Never Commit**
- Passwords or API keys
- Database credentials
- Personal user data
- Environment variables

### **Always Do**
- Validate user inputs
- Use environment variables for secrets
- Follow OWASP security guidelines
- Implement proper authentication

## 🐛 **Bug Reporting & Fixes**

### **Bug Report Format**
```markdown
## 🐛 Bug Description
- **Module**: {A/B/C/D}
- **Severity**: High/Medium/Low
- **Steps to Reproduce**: 1. 2. 3.
- **Expected Behavior**: Description
- **Actual Behavior**: Description
- **Environment**: Browser/OS version
```

### **Fix Process**
1. Create branch: `bugfix/module-{letter}-{description}`
2. Implement fix with tests
3. Document the change
4. Create PR with "fix" prefix

## 📚 **Documentation Requirements**

### **Code Documentation**
- JavaDoc for public methods
- JSX comments for complex components
- API endpoint documentation
- Database schema documentation

### **Module Documentation**
Create/update `docs/MODULE_{LETTER}_GUIDE.md`:
- Module overview
- API endpoints
- Database tables
- Setup instructions
- Testing procedures

## 🚀 **Deployment & Integration**

### **Local Testing**
```bash
# Backend
cd backend && mvn spring-boot:run

# Frontend
cd frontend && npm run dev

# Database
mongod --dbpath /data/db
```

### **Integration Testing**
- Test with other modules
- Verify data flow
- Check API compatibility
- Validate user workflows

## 📞 **Getting Help**

### **Team Communication**
- **Module Issues**: Contact module lead
- **Integration Problems**: Team lead (aqeel-prxy)
- **Git Issues**: Create issue with detailed description
- **Code Review**: Request via PR comments

### **Resources**
- [Module C Reference](MODULE_C_VIVA_GUIDE.md) - Completed implementation
- [Team Collaboration Plan](TEAM_COLLABORATION_PLAN.md)
- [API Documentation](docs/API-Documentation.md)

## 🎯 **Success Criteria**

### **What Makes a Good Contribution**
- ✅ Follows project structure
- ✅ Includes proper tests
- ✅ Well-documented code
- ✅ No security vulnerabilities
- ✅ Integrates smoothly
- ✅ Proper Git attribution

### **Quality Checklist**
- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] No console errors in browser
- [ ] Responsive design works
- [ ] Accessibility standards met
- [ ] Performance acceptable

## 🏅 **Recognition & Rewards**

### **Contribution Recognition**
- GitHub contribution graphs
- Module documentation credits
- Team meeting acknowledgments
- Portfolio project experience

### **Skill Development**
- Full-stack development experience
- Team collaboration skills
- Git workflow mastery
- Industry best practices

---

## 🚀 **Ready to Contribute?**

1. **Read this guide completely**
2. **Set up your development environment**
3. **Choose your module assignment**
4. **Create your feature branch**
5. **Start building amazing features!**

**Your contributions make the Smart Campus Hub project successful!** 🎉

---

*For questions or clarification, contact the team lead: aqeel-prxy*
