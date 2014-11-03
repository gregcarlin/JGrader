package models;
import static play.data.Form.*;
import play.data.validation.Constraints.*;

// Stores Login Information
public class LoginForm {
    @Required
    public String email;
    @Required
    public String password;
}
