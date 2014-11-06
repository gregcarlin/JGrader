package models;
import static play.data.Form.*;
import play.data.validation.Constraints.*;

// Stores Login Information
public class LoginForm {
    @Required
    public String email;
    @Required
    public String password;

    public String validate() {
          if(Teacher.authenticate(email, password) == null) {
              return "Invalid user or password";
          }
          return null;
    }

}
